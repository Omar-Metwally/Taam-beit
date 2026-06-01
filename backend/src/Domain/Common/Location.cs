using SharedKernel;

namespace Domain.Common;

/// <summary>
/// Represents a geographic location using latitude/longitude coordinates.
/// Used by both Customers (delivery destination) and Chefs (operation area).
/// </summary>
public sealed record Location
{
    public double Latitude { get; init; }
    public double Longitude { get; init; }
    public string? AddressLine { get; init; }

    private Location() { }

    public static Result<Location> Create(double latitude, double longitude, string? addressLine = null)
    {
        if (latitude is < -90 or > 90)
            return Result.Failure<Location>(LocationErrors.InvalidLatitude);

        if (longitude is < -180 or > 180)
            return Result.Failure<Location>(LocationErrors.InvalidLongitude);

        return Result.Success(new Location
        {
            Latitude = latitude,
            Longitude = longitude,
            AddressLine = addressLine
        });
    }

    /// <summary>
    /// Calculates the distance to another location in kilometers using the Haversine formula.
    /// </summary>
    public double DistanceTo(Location other)
    {
        const double earthRadiusKm = 6371;

        double dLat = ToRadians(other.Latitude - Latitude);
        double dLon = ToRadians(other.Longitude - Longitude);

        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                 + Math.Cos(ToRadians(Latitude)) * Math.Cos(ToRadians(other.Latitude))
                 * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return earthRadiusKm * c;
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180;
}
