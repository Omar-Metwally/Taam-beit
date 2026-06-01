using Application.Abstractions.Geospatial;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Geospatial;

/// <summary>
/// Implements chef discovery using PostGIS ST_DWithin on the
/// chef_profiles.operation_location geography column.
/// Uses the ix_chef_profiles_location_gist GIST index for O(log n) lookups.
/// </summary>
internal sealed class GeospatialService(ApplicationDbContext dbContext) : IGeospatialService
{
    public async Task<IReadOnlyList<NearbyChefDto>> FindChefsNearLocationAsync(
        double latitude,
        double longitude,
        double radiusKm,
        CancellationToken cancellationToken = default)
    {
        double radiusMetres = radiusKm * 1000;

        // Raw SQL to leverage PostGIS geography functions directly.
        // ST_DWithin with geography columns uses the spheroid model (accurate),
        // and the GIST index prunes the bounding box before exact calculation.
        var results = await dbContext.Database
            .SqlQueryRaw<NearbyChefQueryResult>(
                """
                SELECT
                    u.id                                           AS chef_user_id,
                    ST_Distance(
                        cp.operation_location,
                        ST_MakePoint({1}, {0})::geography
                    ) / 1000.0                                    AS distance_km
                FROM users u
                JOIN chef_profiles cp ON cp.user_id = u.id
                WHERE
                    cp.status = 'Approved'
                    AND ST_DWithin(
                        cp.operation_location,
                        ST_MakePoint({1}, {0})::geography,
                        {2}
                    )
                ORDER BY distance_km ASC
                """,
                latitude, longitude, radiusMetres)
            .ToListAsync(cancellationToken);

        return results
            .Select(r => new NearbyChefDto(r.ChefUserId, r.DistanceKm))
            .ToList();
    }

    // Private projection type for the raw SQL result
    private sealed record NearbyChefQueryResult(Guid ChefUserId, double DistanceKm);
}
