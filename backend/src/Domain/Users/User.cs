using Domain.Common;
using SharedKernel;

namespace Domain.Users;

public sealed class User : Entity
{
    public Guid Id { get; private set; }
    public string Email { get; private set; }
    public string FirstName { get; private set; }
    public string LastName { get; private set; }
    public string PasswordHash { get; private set; }

    /// <summary>Default delivery location set by the user. Used to pre-fill order checkout.</summary>
    public Location? DefaultDeliveryLocation { get; private set; }

    public DateTime CreatedAt { get; private set; }

    /// <summary>Populated when the user has applied for or been granted the chef role.</summary>
    public ChefProfile? ChefProfile { get; private set; }

    /// <summary>Populated when the user has applied for or been granted the delivery man role.</summary>
    public DeliveryManProfile? DeliveryManProfile { get; private set; }

    private User() { }

    /// <summary>
    /// Creates a base user account. Every registered user can place orders immediately.
    /// Role profiles are added separately via ApplyAsChef / ApplyAsDeliveryMan.
    /// </summary>
    public static User Register(
        string email,
        string firstName,
        string lastName,
        string passwordHash,
        DateTime createdAt)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            PasswordHash = passwordHash,
            CreatedAt = createdAt
        };

        user.Raise(new UserRegisteredDomainEvent(user.Id));

        return user;
    }

    // ── Location ─────────────────────────────────────────────────────────────

    public Result SetDefaultDeliveryLocation(Location location)
    {
        DefaultDeliveryLocation = location;
        return Result.Success();
    }

    // ── Chef role ─────────────────────────────────────────────────────────────

    public Result ApplyAsChef(
        Location operationLocation,
        DateTime appliedAt)
    {
        if (ChefProfile is not null)
            return Result.Failure(UserErrors.AlreadyAppliedAsChef);

        ChefProfile = ChefProfile.Create(
            Id,
            operationLocation,
            appliedAt);

        Raise(new UserAppliedAsChefDomainEvent(Id));

        return Result.Success();
    }

    public Result ApproveChefProfile(Guid supervisorUserId, DateTime reviewedAt)
    {
        if (ChefProfile is null)
            return Result.Failure(UserErrors.ChefProfileNotFound);

        var result = ChefProfile.Approve(supervisorUserId, reviewedAt);
        if (result.IsFailure)
            return result;

        Raise(new UserChefProfileApprovedDomainEvent(Id, supervisorUserId));

        return Result.Success();
    }

    public Result RejectChefProfile(Guid supervisorUserId, string reason, DateTime reviewedAt)
    {
        if (ChefProfile is null)
            return Result.Failure(UserErrors.ChefProfileNotFound);

        var result = ChefProfile.Reject(supervisorUserId, reason, reviewedAt);
        if (result.IsFailure)
            return result;

        Raise(new UserChefProfileRejectedDomainEvent(Id, supervisorUserId, reason));

        return Result.Success();
    }

    public Result UpdateHealthCertificateReference(string objectKey)
    {
        if (ChefProfile is null)
            return Result.Failure(UserErrors.ChefProfileNotFound);

        return ChefProfile.UpdateHealthCertificateReference(objectKey);
    }

    public Result UpdatePersonalIdReference(string objectKey)
    {
        if (ChefProfile is null)
            return Result.Failure(UserErrors.ChefProfileNotFound);

        return ChefProfile.UpdatePersonalIdReference(objectKey);
    }

    public Result SetChefAvatarUrl(string avatarUrl)
    {
        if (ChefProfile is null)
            return Result.Failure(UserErrors.ChefProfileNotFound);

        return ChefProfile.SetAvatarUrl(avatarUrl);
    }

        // ── Delivery man role ─────────────────────────────────────────────────────

    public Result ApplyAsDeliveryMan(
        string personalIdNumber,
        VehicleType vehicleType,
        Location initialLocation,
        DateTime appliedAt)
    {
        if (DeliveryManProfile is not null)
            return Result.Failure(UserErrors.AlreadyAppliedAsDeliveryMan);

        DeliveryManProfile = DeliveryManProfile.Create(
            Id,
            personalIdNumber,
            vehicleType,
            initialLocation,
            appliedAt);

        Raise(new UserAppliedAsDeliveryManDomainEvent(Id));

        return Result.Success();
    }

    public Result ApproveDeliveryManProfile(Guid supervisorUserId, DateTime reviewedAt)
    {
        if (DeliveryManProfile is null)
            return Result.Failure(UserErrors.DeliveryManProfileNotFound);

        var result = DeliveryManProfile.Approve(supervisorUserId, reviewedAt);
        if (result.IsFailure)
            return result;

        Raise(new UserDeliveryManProfileApprovedDomainEvent(Id, supervisorUserId));

        return Result.Success();
    }

    public Result RejectDeliveryManProfile(Guid supervisorUserId, string reason, DateTime reviewedAt)
    {
        if (DeliveryManProfile is null)
            return Result.Failure(UserErrors.DeliveryManProfileNotFound);

        var result = DeliveryManProfile.Reject(supervisorUserId, reason, reviewedAt);
        if (result.IsFailure)
            return result;

        Raise(new UserDeliveryManProfileRejectedDomainEvent(Id, supervisorUserId, reason));

        return Result.Success();
    }

    public Result UpdateDeliveryManLocation(Location location)
    {
        if (DeliveryManProfile is null)
            return Result.Failure(UserErrors.DeliveryManProfileNotFound);

        if (!DeliveryManProfile.IsActive)
            return Result.Failure(UserErrors.DeliveryManProfileNotActive);

        return DeliveryManProfile.UpdateLocation(location);
    }

    // ── Convenience ──────────────────────────────────────────────────────────

    public bool IsApprovedChef => ChefProfile?.IsActive ?? false;

    public bool IsApprovedDeliveryMan => DeliveryManProfile?.IsActive ?? false;

    public string FullName => $"{FirstName} {LastName}";
}
