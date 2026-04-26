using Application.Abstractions.Data;
using Application.Abstractions.Geospatial;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Geospatial;

/// <summary>
/// Manages cache_driver_positions (UNLOGGED Postgres table).
/// Each upsert:
///   1. Computes the H3 cell ID at resolution 9 for fast proximity lookups
///   2. Updates the geography column for point queries (customer reloads map)
///   3. Triggers fn_notify_gps() → pg_notify('gps', payload)
///      → GpsNotifyListenerService → SignalR → customer map update
/// </summary>
internal sealed class DeliveryPositionCache(
    ApplicationDbContext dbContext,
    IH3Service h3Service) : IDeliveryPositionCache
{
    private const int H3Resolution = 9;

    public async Task UpsertAsync(
        Guid driverId,
        Guid? orderId,
        double latitude,
        double longitude,
        double? headingDegrees,
        double? speedKmh,
        CancellationToken cancellationToken = default)
    {
        ulong h3Cell = h3Service.LatLngToCell(latitude, longitude, H3Resolution);

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO cache_driver_positions
                (driver_id, order_id, location, h3_index, heading, speed_kmh, updated_at)
            VALUES
                ({0}, {1}, ST_MakePoint({3}, {2})::geography, {4}, {5}, {6}, now())
            ON CONFLICT (driver_id) DO UPDATE SET
                order_id   = EXCLUDED.order_id,
                location   = EXCLUDED.location,
                h3_index   = EXCLUDED.h3_index,
                heading    = EXCLUDED.heading,
                speed_kmh  = EXCLUDED.speed_kmh,
                updated_at = now()
            """,
            driverId, orderId, latitude, longitude,
            (long)h3Cell, headingDegrees, speedKmh);
    }

    public async Task<IReadOnlyList<Guid>> GetNearbyDriverIdsAsync(
        double latitude,
        double longitude,
        int ringSize = 2,
        CancellationToken cancellationToken = default)
    {
        ulong centerCell = h3Service.LatLngToCell(latitude, longitude, H3Resolution);
        IReadOnlyList<ulong> diskCells = h3Service.GridDisk(centerCell, ringSize);

        // Convert ulong[] → long[] for Postgres bigint comparison
        long[] cellIds = diskCells.Select(c => (long)c).ToArray();

        // Plain B-tree index lookup on h3_index bigint column —
        // no spatial calculation needed at this stage
        var driverIds = await dbContext.Database
            .SqlQueryRaw<Guid>(
                """
                SELECT driver_id
                FROM cache_driver_positions
                WHERE h3_index = ANY({0})
                  AND updated_at > now() - interval '10 minutes'
                """,
                (object)cellIds)
            .ToListAsync(cancellationToken);

        return driverIds;
    }

    public async Task<DriverPositionDto?> GetDriverPositionAsync(
        Guid driverId,
        CancellationToken cancellationToken = default)
    {
        var result = await dbContext.Database
            .SqlQueryRaw<DriverPositionRaw>(
                """
                SELECT
                    driver_id,
                    order_id,
                    ST_Y(location::geometry) AS latitude,
                    ST_X(location::geometry) AS longitude,
                    heading,
                    speed_kmh,
                    updated_at
                FROM cache_driver_positions
                WHERE driver_id = {0}
                """,
                driverId)
            .FirstOrDefaultAsync(cancellationToken);

        if (result is null) return null;

        return new DriverPositionDto(
            result.DriverId,
            result.OrderId,
            result.Latitude,
            result.Longitude,
            result.Heading,
            result.SpeedKmh,
            result.UpdatedAt);
    }

    public async Task RemoveAsync(Guid driverId, CancellationToken cancellationToken = default)
    {
        await dbContext.Database.ExecuteSqlRawAsync(
            "DELETE FROM cache_driver_positions WHERE driver_id = {0}",
            driverId);
    }

    // Raw projection for SQL query result
    private sealed record DriverPositionRaw(
        Guid DriverId,
        Guid? OrderId,
        double Latitude,
        double Longitude,
        double? Heading,
        double? SpeedKmh,
        DateTime UpdatedAt);
}
