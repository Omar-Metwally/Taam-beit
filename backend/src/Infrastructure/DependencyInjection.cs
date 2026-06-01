using Amazon.Runtime;
using Amazon.S3;
using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Geospatial;
using Application.Abstractions.Notifications;
using Application.Abstractions.Storage;
using Infrastructure.Authentication;
using Infrastructure.DateTimeProvider;
using Infrastructure.Geospatial;
using Infrastructure.Notifications;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Outbox;
using Infrastructure.Storage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Quartz;
using SharedKernel;
using System.Text;

namespace Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddPersistence(configuration)
            .AddAuthentication(configuration)
            .AddGeospatial()
            .AddNotifications()
            .AddOutboxProcessing()
            .AddStorage(configuration)
            .AddDateTimeProvider();

        return services;
    }

    // ── Persistence ───────────────────────────────────────────────────────────

    private static IServiceCollection AddPersistence(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options
                .UseNpgsql(
                    configuration.GetConnectionString("Database"),
                    npgsql => npgsql.UseNetTopologySuite())  // PostGIS support
                .UseSnakeCaseNamingConvention()             // snake_case column names
                .EnableSensitiveDataLogging()
                .LogTo(Console.WriteLine, LogLevel.Information));             

        services.AddScoped<IApplicationDbContext>(sp =>
            sp.GetRequiredService<ApplicationDbContext>());

        return services;
    }

    // ── Authentication ────────────────────────────────────────────────────────

    private static IServiceCollection AddAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var jwtSettings = configuration
            .GetSection(JwtSettings.SectionName)
            .Get<JwtSettings>()!;

        services.Configure<JwtSettings>(
            configuration.GetSection(JwtSettings.SectionName));

        services.AddHttpContextAccessor();

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtSettings.Issuer,
                    ValidAudience = jwtSettings.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtSettings.SecretKey))
                };

                // Read JWT from HttpOnly cookie instead of Authorization header
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = ctx =>
                    {
                        if (ctx.Request.Cookies.TryGetValue(
                                jwtSettings.CookieName, out string? token))
                        {
                            ctx.Token = token;
                        }
                        return Task.CompletedTask;
                    }
                };

                // SignalR sends the JWT as a query-string parameter
                // because WebSocket upgrades can't set custom headers
                options.Events.OnMessageReceived = ctx =>
                {
                    string? accessToken = ctx.Request.Query["access_token"];

                    bool isSignalRPath = ctx.HttpContext.Request.Path
                        .StartsWithSegments("/hubs");

                    if (!string.IsNullOrEmpty(accessToken) && isSignalRPath)
                    {
                        ctx.Token = accessToken;
                        return Task.CompletedTask;
                    }

                    // Fall back to cookie for regular API requests
                    if (ctx.Request.Cookies.TryGetValue(
                            jwtSettings.CookieName, out string? cookieToken))
                    {
                        ctx.Token = cookieToken;
                    }

                    return Task.CompletedTask;
                };
            });

        services.AddScoped<ITokenProvider, TokenProvider>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IUserContext, UserContext>();
        services.AddScoped<ITrackingTokenService, TrackingTokenService>();

        return services;
    }

    // ── Geospatial ────────────────────────────────────────────────────────────

    private static IServiceCollection AddGeospatial(this IServiceCollection services)
    {
        services.AddScoped<IGeospatialService, GeospatialService>();
        services.AddSingleton<IH3Service, H3Service>();        // stateless, safe as singleton
        services.AddScoped<IDeliveryPositionCache, DeliveryPositionCache>();

        return services;
    }

    // ── Notifications (SignalR + GPS listener) ────────────────────────────────

    private static IServiceCollection AddNotifications(this IServiceCollection services)
    {
        services.AddSignalR();
        services.AddScoped<IOrderNotificationService, OrderNotificationService>();
        services.AddHostedService<GpsNotifyListenerService>();

        return services;
    }

    // ── Object storage (Garage via AWSSDK.S3) ─────────────────────────────────

    private static IServiceCollection AddStorage(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<GarageSettings>(
            configuration.GetSection(GarageSettings.SectionName));

        // IAmazonS3 is registered as a singleton — the AWS SDK client is thread-safe
        services.AddSingleton<IAmazonS3>(sp =>
        {
            var settings = sp.GetRequiredService<IOptions<GarageSettings>>().Value;

            var config = new AmazonS3Config
            {
                ServiceURL    = settings.Endpoint,
                ForcePathStyle = true,   // required for Garage — it doesn't support virtual-host style
                AuthenticationRegion = "garage",  // Garage ignores region but the SDK requires one
                RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
                ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
            };

            return new AmazonS3Client(settings.AccessKey, settings.SecretKey, config);
        });

        services.AddScoped<IFileStorageService, GarageFileStorageService>();
        services.AddScoped<IDocumentStorageService, GarageDocumentStorageService>();

        // NetVips image processing — singleton is safe (stateless, thread-safe)
        services.AddSingleton<IImageProcessingService, NetVipsImageProcessingService>();

        return services;
    }

    // ── Outbox processing (Quartz) ────────────────────────────────────────────

    private static IServiceCollection AddOutboxProcessing(this IServiceCollection services)
    {
        services.AddQuartz(q =>
        {
            var jobKey = new JobKey(nameof(OutboxProcessor));

            q.AddJob<OutboxProcessor>(opts => opts.WithIdentity(jobKey));

            q.AddTrigger(opts => opts
                .ForJob(jobKey)
                .WithIdentity($"{nameof(OutboxProcessor)}-trigger")
                .WithSimpleSchedule(schedule => schedule
                    .WithIntervalInSeconds(5)
                    .RepeatForever()));
        });

        services.AddQuartzHostedService(opts => opts.WaitForJobsToComplete = true);

        return services;
    }

    private static IServiceCollection AddDateTimeProvider(this IServiceCollection services)
    {
        services.AddSingleton<IDateTimeProvider, DateTimeProvider.DateTimeProvider>();
        return services;
    }
}
