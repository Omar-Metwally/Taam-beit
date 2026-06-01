namespace Application.Abstractions.Geospatial;

/// <summary>
/// PostGIS-backed spatial queries.
/// Implemented in Infrastructure using ST_DWithin on the chefs geography column.
/// </summary>
public interface IGeospatialService
{
    /// <summary>
    /// Returns IDs of approved chefs whose operation location falls within
    /// the given radius of the customer's location.
    /// Uses ST_DWithin with the ix_chefs_location_gist index.
    /// Results are ordered by distance ascending.
    /// </summary>
    Task<IReadOnlyList<NearbyChefDto>> FindChefsNearLocationAsync(
        double latitude,
        double longitude,
        double radiusKm,
        CancellationToken cancellationToken = default);
}

public sealed record NearbyChefDto(
    Guid ChefUserId,
    double DistanceKm);
