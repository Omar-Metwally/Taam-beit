using Application.Abstractions.Geospatial;
using H3;
using H3.Model;

namespace Infrastructure.Geospatial;

/// <summary>
/// Implements IH3Service using the H3.net NuGet package (H3Lib).
/// Resolution 9 cells are ~0.1 km² — roughly one city block.
/// Used for high-frequency driver proximity fan-out queries.
/// </summary>
internal sealed class H3Service : IH3Service
{
    public ulong LatLngToCell(double latitude, double longitude, int resolution = 9)
    {
        var geoCoord = new GeoCoord(
            lat: latitude.ToRadians(),
            lng: longitude.ToRadians());

        return H3Index.FromGeoCoord(geoCoord, resolution);
    }

    public IReadOnlyList<ulong> GridDisk(ulong cellId, int k)
    {
        var center = new H3Index(cellId);
        return center.KRing(k).Select(h => (ulong)h).ToList();
    }

    public (double Latitude, double Longitude) CellToLatLng(ulong cellId)
    {
        var index = new H3Index(cellId);
        var coord = index.ToGeoCoord();
        return (coord.Latitude.ToDegrees(), coord.Longitude.ToDegrees());
    }
}

file static class AngleExtensions
{
    public static double ToRadians(this double degrees) => degrees * Math.PI / 180.0;
    public static double ToDegrees(this double radians) => radians * 180.0 / Math.PI;
}
