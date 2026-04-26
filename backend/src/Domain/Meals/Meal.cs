using Domain.Common;
using SharedKernel;

namespace Domain.Meals;

public sealed class Meal : Entity
{
    public Guid Id { get; private set; }
    public Guid ChefId { get; private set; }
    public string Name { get; private set; }
    public string? Description { get; private set; }
    public bool IsAvailable { get; private set; }
    public DateTime CreatedAt { get; private set; }

    /// <summary>
    /// URL of the meal image stored in object storage (MinIO/S3).
    /// Null until the chef uploads a photo.
    /// </summary>
    public string? ImageUrl { get; private set; }

    /// <summary>
    /// Category of dish — used for filtering on the browse page.
    /// </summary>
    public DishType DishType { get; private set; }

    /// <summary>
    /// Free-text cuisine tag set by the chef (e.g. "Egyptian", "Italian", "Chinese").
    /// Used for cuisine-type filtering on the browse page.
    /// </summary>
    public string? CuisineType { get; private set; }

    private readonly List<MealVariant> _variants = [];
    public IReadOnlyList<MealVariant> Variants => _variants.AsReadOnly();

    private readonly List<SideDish> _sideDishes = [];
    public IReadOnlyList<SideDish> SideDishes => _sideDishes.AsReadOnly();

    private readonly List<ToppingGroup> _toppingGroups = [];
    public IReadOnlyList<ToppingGroup> ToppingGroups => _toppingGroups.AsReadOnly();

    private Meal() { }

    /// <summary>
    /// Creates a new meal with one default variant already attached.
    /// The meal is never in a zero-variant state.
    /// </summary>
    public static Meal Create(
        Guid chefId,
        string name,
        string? description,
        DishType dishType,
        string? cuisineType,
        string defaultVariantName,
        Money defaultVariantPrice,
        DateTime createdAt)
    {
        var meal = new Meal
        {
            Id = Guid.NewGuid(),
            ChefId = chefId,
            Name = name,
            Description = description,
            DishType = dishType,
            CuisineType = cuisineType,
            IsAvailable = true,
            CreatedAt = createdAt
        };

        var defaultVariant = MealVariant.Create(
            meal.Id,
            defaultVariantName,
            defaultVariantPrice,
            isDefault: true);

        meal._variants.Add(defaultVariant);
        meal.Raise(new MealCreatedDomainEvent(meal.Id, chefId));

        return meal;
    }

    public Result Update(string name, string? description, DishType dishType, string? cuisineType)
    {
        Name = name;
        Description = description;
        DishType = dishType;
        CuisineType = cuisineType;
        return Result.Success();
    }

    public Result SetAvailability(bool isAvailable)
    {
        IsAvailable = isAvailable;
        return Result.Success();
    }

    public Result SetImageUrl(string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return Result.Failure(MealErrors.InvalidImageUrl);

        ImageUrl = imageUrl;
        return Result.Success();
    }

    // ── Variants ─────────────────────────────────────────────────────────────

    public Result<MealVariant> AddVariant(string name, Money price)
    {
        bool nameExists = _variants.Any(v =>
            v.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        if (nameExists)
            return Result.Failure<MealVariant>(MealErrors.VariantNameAlreadyExists(name));

        var variant = MealVariant.Create(Id, name, price, isDefault: false);
        _variants.Add(variant);

        return Result.Success(variant);
    }

    public Result UpdateVariant(Guid variantId, string name, Money price)
    {
        var variant = _variants.FirstOrDefault(v => v.Id == variantId);
        if (variant is null)
            return Result.Failure(MealErrors.VariantNotFound(variantId));

        bool nameConflict = _variants.Any(v =>
            v.Id != variantId &&
            v.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        if (nameConflict)
            return Result.Failure(MealErrors.VariantNameAlreadyExists(name));

        return variant.Update(name, price);
    }

    public Result RemoveVariant(Guid variantId)
    {
        if (_variants.Count == 1)
            return Result.Failure(MealErrors.CannotRemoveLastVariant);

        var variant = _variants.FirstOrDefault(v => v.Id == variantId);
        if (variant is null)
            return Result.Failure(MealErrors.VariantNotFound(variantId));

        if (variant.IsDefault)
            return Result.Failure(MealErrors.CannotRemoveDefaultVariant);

        _variants.Remove(variant);
        return Result.Success();
    }

    public Result SetDefaultVariant(Guid variantId)
    {
        var variant = _variants.FirstOrDefault(v => v.Id == variantId);
        if (variant is null)
            return Result.Failure(MealErrors.VariantNotFound(variantId));

        // Clear current default then set the new one
        foreach (var v in _variants)
            v.ClearDefault();

        variant.SetAsDefault();
        return Result.Success();
    }

    /// <summary>Convenience — returns the default variant for display in listings.</summary>
    public MealVariant DefaultVariant =>
        _variants.First(v => v.IsDefault);

    // ── Side dishes ──────────────────────────────────────────────────────────

    public Result AddSideDish(string name, string? description, Money price, bool isRequired)
    {
        var sideDish = SideDish.Create(Id, name, description, price, isRequired);
        _sideDishes.Add(sideDish);
        return Result.Success();
    }

    public Result RemoveSideDish(Guid sideDishId)
    {
        var sideDish = _sideDishes.FirstOrDefault(s => s.Id == sideDishId);
        if (sideDish is null)
            return Result.Failure(MealErrors.SideDishNotFound(sideDishId));

        _sideDishes.Remove(sideDish);
        return Result.Success();
    }

    // ── Topping groups ────────────────────────────────────────────────────────

    public Result<ToppingGroup> AddToppingGroup(string name, int minSelections, int maxSelections)
    {
        var result = ToppingGroup.Create(Id, name, minSelections, maxSelections);
        if (result.IsFailure)
            return Result.Failure<ToppingGroup>(result.Error);

        _toppingGroups.Add(result.Value);
        return result;
    }

    public Result AddToppingOption(Guid toppingGroupId, string name, Money extraPrice)
    {
        var group = _toppingGroups.FirstOrDefault(g => g.Id == toppingGroupId);
        if (group is null)
            return Result.Failure(MealErrors.ToppingGroupNotFound(toppingGroupId));

        return group.AddOption(name, extraPrice);
    }

    public Result RemoveToppingGroup(Guid toppingGroupId)
    {
        var group = _toppingGroups.FirstOrDefault(g => g.Id == toppingGroupId);
        if (group is null)
            return Result.Failure(MealErrors.ToppingGroupNotFound(toppingGroupId));

        _toppingGroups.Remove(group);
        return Result.Success();
    }

    // ── Validation helpers (used by Order) ────────────────────────────────────

    public Result ValidateVariantSelection(Guid selectedVariantId)
    {
        bool exists = _variants.Any(v => v.Id == selectedVariantId);
        return exists
            ? Result.Success()
            : Result.Failure(MealErrors.VariantNotFound(selectedVariantId));
    }

    public Result ValidateSideDishSelections(IReadOnlyList<Guid> selectedSideDishIds)
    {
        var validIds = _sideDishes.Select(s => s.Id).ToHashSet();

        foreach (var id in selectedSideDishIds)
        {
            if (!validIds.Contains(id))
                return Result.Failure(MealErrors.SideDishNotFound(id));
        }

        var requiredNotSelected = _sideDishes
            .Where(s => s.IsRequired && !selectedSideDishIds.Contains(s.Id))
            .ToList();

        if (requiredNotSelected.Count > 0)
            return Result.Failure(MealErrors.RequiredSideDishMissing(requiredNotSelected[0].Name));

        return Result.Success();
    }

    public Result ValidateToppingSelections(IReadOnlyList<Guid> selectedToppingOptionIds)
    {
        foreach (var group in _toppingGroups)
        {
            var selectionsForGroup = selectedToppingOptionIds
                .Where(id => group.Options.Any(o => o.Id == id))
                .ToList();

            var result = group.ValidateSelections(selectionsForGroup);
            if (result.IsFailure)
                return result;
        }

        return Result.Success();
    }
}
