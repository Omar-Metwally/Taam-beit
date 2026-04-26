using Application.Abstractions.Notifications;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Npgsql;

namespace Infrastructure.Notifications;

/// <summary>
/// Long-running BackgroundService that holds a persistent LISTEN connection
/// to Postgres on the 'gps' channel.
///
/// Flow:
///   Driver app → POST /driver/location
///   → DeliveryPositionCache.UpsertAsync (UNLOGGED table write)
///   → fn_notify_gps trigger fires
///   → pg_notify('gps', '{driverId, orderId, lat, lng, heading, ts}')
///   → THIS service receives notification
///   → IOrderNotificationService.NotifyCustomerDriverLocationAsync
///   → SignalR push to "order-{orderId}" group
///   → Customer map updates in real time
///
/// Using a persistent LISTEN connection is far more efficient than polling —
/// the database pushes changes rather than the app asking repeatedly.
/// </summary>
internal sealed class GpsNotifyListenerService(
    IConfiguration configuration,
    IServiceScopeFactory scopeFactory,
    ILogger<GpsNotifyListenerService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        string connectionString = configuration.GetConnectionString("Database")!;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ListenAsync(connectionString, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "GPS listener connection lost. Reconnecting in 5 seconds...");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

    private async Task ListenAsync(string connectionString, CancellationToken stoppingToken)
    {
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync(stoppingToken);

        // Register handler before issuing LISTEN so no notifications are missed
        conn.Notification += OnGpsNotification;

        await using (var cmd = new NpgsqlCommand("LISTEN gps", conn))
            await cmd.ExecuteNonQueryAsync(stoppingToken);

        logger.LogInformation("GPS listener connected and listening on 'gps' channel");

        // Wait for notifications — NpgsqlConnection.WaitAsync blocks until
        // a notification arrives or the cancellation token fires
        while (!stoppingToken.IsCancellationRequested)
            await conn.WaitAsync(stoppingToken);
    }

    private void OnGpsNotification(object sender, NpgsqlNotificationEventArgs e)
    {
        try
        {
            var payload = JsonConvert.DeserializeObject<GpsPayload>(e.Payload);
            if (payload is null) return;

            // Fire-and-forget into a scoped service — we don't want to block the listener
            _ = Task.Run(async () =>
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var notificationService = scope.ServiceProvider
                    .GetRequiredService<IOrderNotificationService>();

                await notificationService.NotifyCustomerDriverLocationAsync(
                    payload.OrderId,
                    payload.Lat,
                    payload.Lng,
                    payload.Heading);
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to process GPS notification payload: {Payload}", e.Payload);
        }
    }

    private sealed record GpsPayload(
        Guid DriverId,
        Guid OrderId,
        double Lat,
        double Lng,
        double? Heading,
        long Ts);
}
