namespace Application.Abstractions.Geospatial;

/// <summary>
/// Abstraction over Uber's H3 hexagonal geospatial indexing library.
/// Used for driver fan-out proximity queries — faster than PostGIS ST_DWithin
/// for high-frequency "who is nearby?" lookups because it resolves to a plain
/// integer array lookup on a B-tree indexed bigint column.
/// </summary>
public interface IH3Service
{
    /// <summary>
    /// Converts a lat/lng coordinate to an H3 cell ID at the given resolution.
    /// Resolution 9 (~0.1 km²) is the default for delivery proximity.
    /// </summary>
    ulong LatLngToCell(double latitude, double longitude, int resolution = 9);

    /// <summary>
    /// Returns all H3 cell IDs within k rings of the given center cell.
    /// k=1 → 7 cells, k=2 → 19 cells, k=3 → 37 cells.
    /// These cell IDs are used to query cache_driver_positions.
    /// </summary>
    IReadOnlyList<ulong> GridDisk(ulong cellId, int k);

    /// <summary>
    /// Returns the approximate center lat/lng of a given H3 cell.
    /// </summary>
    (double Latitude, double Longitude) CellToLatLng(ulong cellId);
}
