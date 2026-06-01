using Application.Abstractions.Geospatial;
using H3;
using H3.Algorithms;
using H3.Model;

namespace Infrastructure.Geospatial;

internal sealed class H3Service : IH3Service
{
    public ulong LatLngToCell(double latitude, double longitude, int resolution = 9)
    {
        var latLng = new LatLng(
            latitude * Math.PI / 180.0,
            longitude * Math.PI / 180.0);

        return H3Index.FromLatLng(latLng, resolution);
    }

    public IReadOnlyList<ulong> GridDisk(ulong cellId, int k)
    {
        var center = new H3Index(cellId);

        return center.GridDiskDistances(k)
            .Select(item => (ulong)item.Index)
            .ToList();
    }

    public (double Latitude, double Longitude) CellToLatLng(ulong cellId)
    {
        var index = new H3Index(cellId);
        var latLng = index.ToLatLng();

        return (
            latLng.LatitudeDegrees,
            latLng.LongitudeDegrees);
    }
}