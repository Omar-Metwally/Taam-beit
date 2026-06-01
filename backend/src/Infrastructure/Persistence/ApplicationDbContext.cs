using Application.Abstractions.Data;
using Domain.Deliveries;
using Domain.Meals;
using Domain.Orders;
using Domain.Users;
using Domain.Common;
using Infrastructure.Persistence.Outbox;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite;
using NetTopologySuite.Geometries;
using Newtonsoft.Json;
using SharedKernel;
using Location = Domain.Common.Location;

namespace Infrastructure.Persistence;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : DbContext(options), IApplicationDbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Meal> Meals => Set<Meal>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<DeliveryTracking> DeliveryTrackings => Set<DeliveryTracking>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply all IEntityTypeConfiguration classes in this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        // Enable PostGIS extension
        modelBuilder.HasPostgresExtension("postgis");
        //modelBuilder.HasPostgresExtension("h3");
    }

    /// <summary>
    /// Before persisting, serialises all pending domain events from aggregates
    /// into OutboxMessage rows — same transaction, guaranteed delivery.
    /// </summary>
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SetLocationPoints();
        AddOutboxMessages();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void AddOutboxMessages()
    {
        var entites = ChangeTracker
            .Entries<Entity>();

        var domainEvents = ChangeTracker
            .Entries<Entity>()
            .SelectMany(e => e.Entity.DomainEvents)
            .ToList();

        var outboxMessages = domainEvents.Select(e => new OutboxMessage
        {
            Id = Guid.NewGuid(),
            Type = e.GetType().AssemblyQualifiedName!,
            Payload = JsonConvert.SerializeObject(e, new JsonSerializerSettings
            {
                TypeNameHandling = TypeNameHandling.All
            }),
            CreatedAt = DateTime.UtcNow
        }).ToList();

        // Clear events from all aggregates after capturing them
        foreach (var entry in ChangeTracker.Entries<Entity>())
            entry.Entity.ClearDomainEvents();

        Set<OutboxMessage>().AddRange(outboxMessages);
    }

    private void SetLocationPoints()
    {
        var geometryFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

        foreach (var entry in ChangeTracker.Entries<Location>())
        {
            if (entry.State is EntityState.Added or EntityState.Modified)
            {
                var location = entry.Entity;
                var point = geometryFactory.CreatePoint(
                    new Coordinate(location.Longitude, location.Latitude)); // ← note: X=lng, Y=lat

                entry.Property("_point").CurrentValue = point;
            }
        }
    }
}
