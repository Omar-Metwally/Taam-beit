using SharedKernel;

namespace Domain.Common;

public static class LocationErrors
{
    public static readonly Error InvalidLatitude = Error.Problem(
        "Location.InvalidLatitude",
        "Latitude must be between -90 and 90 degrees.");

    public static readonly Error InvalidLongitude = Error.Problem(
        "Location.InvalidLongitude",
        "Longitude must be between -180 and 180 degrees.");
}
