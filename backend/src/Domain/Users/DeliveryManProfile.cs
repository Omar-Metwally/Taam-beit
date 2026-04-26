using Domain.Common;
using SharedKernel;

namespace Domain.Users;

/// <summary>
/// Represents a user's delivery man role application and approval state.
/// Owned by the User aggregate — never exists without a User.
/// </summary>
public sealed class DeliveryManProfile : Entity
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string PersonalIdNumber { get; private set; }
    public VehicleType VehicleType { get; private set; }

    /// <summary>
    /// Last known location of the delivery man.
    /// Updated on every GPS tick via UpdateLocation().
    /// Null when offline or not yet reported.
    /// The live cache (cache_driver_positions) is the source of truth
    /// for real-time position — this field is for domain availability checks.
    /// </summary>
    public Location? CurrentLocation { get; private set; }

    public ProfileStatus Status { get; private set; }
    public string? RejectionReason { get; private set; }
    public DateTime AppliedAt { get; private set; }
    public DateTime? ReviewedAt { get; private set; }
    public Guid? ReviewedByUserId { get; private set; }

    private DeliveryManProfile() { }

    internal static DeliveryManProfile Create(
        Guid userId,
        string personalIdNumber,
        VehicleType vehicleType,
        Location initialLocation,
        DateTime appliedAt)
    {
        return new DeliveryManProfile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PersonalIdNumber = personalIdNumber,
            VehicleType = vehicleType,
            CurrentLocation = initialLocation,
            Status = ProfileStatus.Pending,
            AppliedAt = appliedAt
        };
    }

    internal Result Approve(Guid supervisorUserId, DateTime reviewedAt)
    {
        if (Status != ProfileStatus.Pending)
            return Result.Failure(UserErrors.ProfileNotPending("DeliveryMan"));

        Status = ProfileStatus.Approved;
        ReviewedByUserId = supervisorUserId;
        ReviewedAt = reviewedAt;
        RejectionReason = null;

        return Result.Success();
    }

    internal Result Reject(Guid supervisorUserId, string reason, DateTime reviewedAt)
    {
        if (Status != ProfileStatus.Pending)
            return Result.Failure(UserErrors.ProfileNotPending("DeliveryMan"));

        if (string.IsNullOrWhiteSpace(reason))
            return Result.Failure(UserErrors.RejectionReasonRequired);

        Status = ProfileStatus.Rejected;
        ReviewedByUserId = supervisorUserId;
        ReviewedAt = reviewedAt;
        RejectionReason = reason;

        return Result.Success();
    }

    /// <summary>
    /// Updates the delivery man's last known domain-level location.
    /// The real-time cache update is handled separately in the infrastructure layer.
    /// </summary>
    internal Result UpdateLocation(Location location)
    {
        CurrentLocation = location;
        return Result.Success();
    }

    public bool IsActive => Status == ProfileStatus.Approved;

    /// <summary>
    /// Returns true if this delivery man is within range of a pickup location.
    /// Uses the delivery man's current known location for proximity check.
    /// </summary>
    public bool IsNearby(Location pickupLocation, double radiusKm)
    {
        if (CurrentLocation is null)
            return false;

        return CurrentLocation.DistanceTo(pickupLocation) <= radiusKm;
    }
}
