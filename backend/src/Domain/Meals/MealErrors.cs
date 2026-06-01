using SharedKernel;

namespace Domain.Meals;

public static class MealErrors
{
    public static Error NotFound(Guid mealId) => Error.NotFound(
        "Meals.NotFound",
        $"The meal with Id = '{mealId}' was not found.");

    public static readonly Error NotAvailable = Error.Problem(
        "Meals.NotAvailable",
        "This meal is currently unavailable.");

    public static readonly Error InvalidImageUrl = Error.Problem(
        "Meals.InvalidImageUrl",
        "The provided image URL is invalid.");

    public static readonly Error UpdateFailed = Error.Problem(
        "Meals.UpdateFailure",
        "Could not update the meal.");

    public static readonly Error CannotModifyArchivedMeal = Error.Problem(
        "Meals.CannotModifyArchivedMeal",
        "An archived meal cannot be modified. Restore it first.");

    public static readonly Error CannotActivateWithoutVariants = Error.Problem(
        "Meals.CannotActivateWithoutVariants",
        "A meal must have at least one variant before it can be made available.");

    // ── Archive / Restore ─────────────────────────────────────────────────────

    public static readonly Error AlreadyArchived = Error.Problem(
        "Meals.AlreadyArchived",
        "This meal is already archived.");

    public static readonly Error NotArchived = Error.Problem(
        "Meals.NotArchived",
        "This meal is not archived and cannot be restored.");

    public static readonly Error CannotArchiveWithActiveOrders = Error.Problem(
        "Meals.CannotArchiveWithActiveOrders",
        "This meal has active or pending orders and cannot be archived yet. " +
        "Wait for all current orders to complete before archiving.");

    // ── Variants ──────────────────────────────────────────────────────────────

    public static readonly Error CannotRemoveLastVariant = Error.Problem(
        "Meals.CannotRemoveLastVariant",
        "A meal must have at least one variant.");

    public static Error VariantNotFound(Guid variantId) => Error.NotFound(
        "Meals.VariantNotFound",
        $"The variant with Id = '{variantId}' was not found on this meal.");

    public static Error VariantNameAlreadyExists(string name) => Error.Conflict(
        "Meals.VariantNameAlreadyExists",
        $"A variant named '{name}' already exists on this meal.");

    public static readonly Error CannotRemoveDefaultVariant = Error.Problem(
        "Meals.CannotRemoveDefaultVariant",
        "Cannot remove the default variant. Set another variant as default first.");

    // ── Side dishes ───────────────────────────────────────────────────────────

    public static Error SideDishNotFound(Guid sideDishId) => Error.NotFound(
        "Meals.SideDishNotFound",
        $"The side dish with Id = '{sideDishId}' was not found on this meal.");

    public static Error SideDishNameAlreadyExists(string name) => Error.Conflict(
        "Meals.SideDishNameAlreadyExists",
        $"A side dish named '{name}' already exists on this meal.");

    public static Error RequiredSideDishMissing(string name) => Error.Problem(
        "Meals.RequiredSideDishMissing",
        $"The required side dish '{name}' must be selected.");

    // ── Topping groups ────────────────────────────────────────────────────────

    public static Error ToppingGroupNotFound(Guid groupId) => Error.NotFound(
        "Meals.ToppingGroupNotFound",
        $"The topping group with Id = '{groupId}' was not found on this meal.");

    public static Error ToppingGroupNameAlreadyExists(string name) => Error.Conflict(
        "Meals.ToppingGroupNameAlreadyExists",
        $"A topping group named '{name}' already exists on this meal.");
}

public static class ToppingGroupErrors
{
    public static readonly Error NegativeMin = Error.Problem(
        "ToppingGroup.NegativeMin",
        "Minimum selections cannot be negative.");

    public static readonly Error MaxTooLow = Error.Problem(
        "ToppingGroup.MaxTooLow",
        "Maximum selections must be at least 1.");

    public static readonly Error MinExceedsMax = Error.Problem(
        "ToppingGroup.MinExceedsMax",
        "Minimum selections cannot exceed maximum selections.");

    public static Error OptionNotFound(Guid optionId) => Error.NotFound(
        "ToppingGroup.OptionNotFound",
        $"The topping option with Id = '{optionId}' was not found in this group.");

    public static Error InvalidOptions(Guid groupId) => Error.Problem(
        "ToppingGroup.InvalidOptions",
        $"One or more selected options do not belong to topping group '{groupId}'.");

    public static Error BelowMinSelections(string groupName, int min) => Error.Problem(
        "ToppingGroup.BelowMinSelections",
        $"'{groupName}' requires at least {min} selection(s).");

    public static Error AboveMaxSelections(string groupName, int max) => Error.Problem(
        "ToppingGroup.AboveMaxSelections",
        $"'{groupName}' allows at most {max} selection(s).");

    public static Error OptionNameAlreadyExists(string name) => Error.Conflict(
        "ToppingGroup.OptionNameAlreadyExists",
        $"An option named '{name}' already exists in this group.");
}
