namespace Application.Abstractions.Data;

/// <summary>
/// Manages the ephemeral driver position cache (cache_driver_positions UNLOGGED table).
/// All writes trigger pg_notify for real-time SignalR fan-out.
/// Uses H3 cell indexing for fast proximity queries.
/// </summary>
public interface IDeliveryPositionCache
{
    /// <summary>
    /// Upserts the driver's current position.
    /// Triggers the pg_notify GPS fan-out to the customer's SignalR group.
    /// </summary>
    Task UpsertAsync(
        Guid driverId,
        Guid? orderId,
        double latitude,
        double longitude,
        double? headingDegrees,
        double? speedKmh,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the IDs of all delivery men currently within k H3 rings
    /// of the given H3 cell at resolution 9.
    /// Used to fan out "new order available" notifications.
    /// </summary>
    Task<IReadOnlyList<Guid>> GetNearbyDriverIdsAsync(
        double latitude,
        double longitude,
        int ringSize = 2,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the last known position of a specific driver.
    /// Used when a customer reloads the tracking map.
    /// </summary>
    Task<DriverPositionDto?> GetDriverPositionAsync(
        Guid driverId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes the driver's position entry when they go offline
    /// or complete their active delivery.
    /// </summary>
    Task RemoveAsync(Guid driverId, CancellationToken cancellationToken = default);
}

public sealed record DriverPositionDto(
    Guid DriverId,
    Guid? OrderId,
    double Latitude,
    double Longitude,
    double? HeadingDegrees,
    double? SpeedKmh,
    DateTime UpdatedAt);
