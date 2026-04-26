using SharedKernel;

namespace Domain.Users;

public static class UserErrors
{
    public static Error NotFound(Guid userId) => Error.NotFound(
        "Users.NotFound",
        $"The user with Id = '{userId}' was not found.");

    public static readonly Error NotFoundByEmail = Error.NotFound(
        "Users.NotFoundByEmail",
        "No user with the specified email was found.");

    public static readonly Error EmailNotUnique = Error.Conflict(
        "Users.EmailNotUnique",
        "The provided email is already in use.");

    public static readonly Error Unauthorized = Error.Failure(
        "Users.Unauthorized",
        "You are not authorized to perform this action.");

    public static readonly Error InvalidAvatarUrl = Error.Problem(
        "Users.InvalidAvatarUrl",
        "The provided avatar URL is invalid.");

        // ── Chef profile ──────────────────────────────────────────────────────────

    public static readonly Error AlreadyAppliedAsChef = Error.Conflict(
        "Users.AlreadyAppliedAsChef",
        "This user has already submitted a chef application.");

    public static readonly Error ChefProfileNotFound = Error.NotFound(
        "Users.ChefProfileNotFound",
        "This user has not applied for the chef role.");

    public static readonly Error ChefProfileNotActive = Error.Problem(
        "Users.ChefProfileNotActive",
        "This user's chef profile is not approved.");

    // ── Delivery man profile ──────────────────────────────────────────────────

    public static readonly Error AlreadyAppliedAsDeliveryMan = Error.Conflict(
        "Users.AlreadyAppliedAsDeliveryMan",
        "This user has already submitted a delivery man application.");

    public static readonly Error DeliveryManProfileNotFound = Error.NotFound(
        "Users.DeliveryManProfileNotFound",
        "This user has not applied for the delivery man role.");

    public static readonly Error DeliveryManProfileNotActive = Error.Problem(
        "Users.DeliveryManProfileNotActive",
        "This user's delivery man profile is not approved.");

    // ── Shared ────────────────────────────────────────────────────────────────

    public static Error ProfileNotPending(string role) => Error.Problem(
        "Users.ProfileNotPending",
        $"The {role} profile is not in Pending status and cannot be reviewed.");

    public static Error DocumentNotUploaded(string documentType) => Error.NotFound(
        "Users.DocumentNotUploaded",
        $"The {documentType} document has not been uploaded yet.");

    public static readonly Error RejectionReasonRequired = Error.Problem(
        "Users.RejectionReasonRequired",
        "A reason must be provided when rejecting an application.");
}
