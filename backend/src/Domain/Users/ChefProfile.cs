using Domain.Common;
using SharedKernel;

namespace Domain.Users;

/// <summary>
/// Represents a user's chef role application and approval state.
/// Owned by the User aggregate — never exists without a User.
/// </summary>
public sealed class ChefProfile : Entity
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    /// <summary>
    /// Object key of the personal ID document stored in the private chef-documents bucket.
    /// Never a URL — presigned URLs are generated on demand by GetChefDocumentUrlQuery.
    /// </summary>
    public string? PersonalIdReference { get; private set; }

    /// <summary>
    /// Object key of the health certificate stored in the private chef-documents bucket.
    /// Never a URL — presigned URLs are generated on demand by GetChefDocumentUrlQuery.
    /// </summary>
    public string? HealthCertificateReference { get; private set; }

    /// <summary>The location from which the chef prepares and operates.</summary>
    public Location OperationLocation { get; private set; }

    public ProfileStatus Status { get; private set; }
    public string? RejectionReason { get; private set; }

    /// <summary>URL of chef avatar stored in object storage.</summary>
    public string? AvatarUrl { get; private set; }
    public DateTime AppliedAt { get; private set; }
    public DateTime? ReviewedAt { get; private set; }
    public Guid? ReviewedByUserId { get; private set; }

    private ChefProfile() { }

    internal static ChefProfile Create(
        Guid userId,
        Location operationLocation,
        DateTime appliedAt)
    {
        return new ChefProfile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            OperationLocation = operationLocation,
            Status = ProfileStatus.Pending,
            AppliedAt = appliedAt
        };
    }

    internal Result UpdateHealthCertificateReference(string objectKey)
    {
        HealthCertificateReference = objectKey;
        return Result.Success();
    }

    internal Result UpdatePersonalIdReference(string objectKey)
    {
        PersonalIdReference = objectKey;
        return Result.Success();
    }

    internal Result Approve(Guid supervisorUserId, DateTime reviewedAt)
    {
        if (Status != ProfileStatus.Pending)
            return Result.Failure(UserErrors.ProfileNotPending("Chef"));

        Status = ProfileStatus.Approved;
        ReviewedByUserId = supervisorUserId;
        ReviewedAt = reviewedAt;
        RejectionReason = null;

        return Result.Success();
    }

    internal Result Reject(Guid supervisorUserId, string reason, DateTime reviewedAt)
    {
        if (Status != ProfileStatus.Pending)
            return Result.Failure(UserErrors.ProfileNotPending("Chef"));

        if (string.IsNullOrWhiteSpace(reason))
            return Result.Failure(UserErrors.RejectionReasonRequired);

        Status = ProfileStatus.Rejected;
        ReviewedByUserId = supervisorUserId;
        ReviewedAt = reviewedAt;
        RejectionReason = reason;

        return Result.Success();
    }

    public Result SetAvatarUrl(string avatarUrl)
    {
        if (string.IsNullOrWhiteSpace(avatarUrl))
            return Result.Failure(UserErrors.InvalidAvatarUrl);

        AvatarUrl = avatarUrl;
        return Result.Success();
    }

        public bool IsActive => Status == ProfileStatus.Approved;

    /// <summary>
    /// Checks whether this chef can deliver to the given customer location
    /// within their configured delivery radius.
    /// </summary>
    public bool CanDeliverTo(Location customerLocation, double deliveryRadiusKm) =>
        OperationLocation.DistanceTo(customerLocation) <= deliveryRadiusKm;
}

// Extension added for avatar support
