using Domain.Common;
using SharedKernel;

namespace Domain.Meals;

public sealed class Meal : Entity
{
    public Guid Id { get; private set; }
    public Guid ChefId { get; private set; }
    public string Name { get; private set; } = null!;
    public string? Description { get; private set; }
    public MealStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? ArchivedAt { get; private set; }

    /// <summary>
    /// URL of the meal image (medium variant) stored in object storage.
    /// Null until the chef uploads a photo.
    /// </summary>
    public string? ImageUrl { get; private set; }

    /// <summary>
    /// Storage key prefix used to construct responsive image URLs
    /// and to clean up old images on replacement.
    /// </summary>
    public string? ImageKeyPrefix { get; private set; }

    public DishType DishType { get; private set; }

    public string? CuisineType { get; private set; }

    /// <summary>
    /// Derived — not stored. True only when Status is Active.
    /// </summary>
    public bool IsAvailable => Status == MealStatus.Active;

    private readonly List<MealVariant> _variants = [];
    public IReadOnlyList<MealVariant> Variants => _variants.AsReadOnly();

    private readonly List<SideDish> _sideDishes = [];
    public IReadOnlyList<SideDish> SideDishes => _sideDishes.AsReadOnly();

    private readonly List<ToppingGroup> _toppingGroups = [];
    public IReadOnlyList<ToppingGroup> ToppingGroups => _toppingGroups.AsReadOnly();

    private Meal() { }

    // ── Factory ───────────────────────────────────────────────────────────────

    public static Meal Create(
        Guid chefId,
        string name,
        string? description,
        DishType dishType,
        string? cuisineType,
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
            Status = MealStatus.Draft,
            CreatedAt = createdAt,
        };

        meal.Raise(new MealCreatedDomainEvent(meal.Id, chefId));
        return meal;
    }

    // ── Core fields ───────────────────────────────────────────────────────────

    public Result Update(string name, string? description, DishType dishType, string? cuisineType)
    {
        if (Status == MealStatus.Archived)
            return Result.Failure(MealErrors.CannotModifyArchivedMeal);

        Name = name;
        Description = description;
        DishType = dishType;
        CuisineType = cuisineType;
        return Result.Success();
    }

    public Result SetImage(string imageUrl, string imageKeyPrefix)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return Result.Failure(MealErrors.InvalidImageUrl);

        ImageUrl = imageUrl;
        ImageKeyPrefix = imageKeyPrefix;
        return Result.Success();
    }

    // ── Availability (Draft ↔ Active) ─────────────────────────────────────────

    public Result SetAvailability(bool isAvailable)
    {
        if (Status == MealStatus.Archived)
            return Result.Failure(MealErrors.CannotModifyArchivedMeal);

        if (isAvailable && _variants.Count == 0)
            return Result.Failure(MealErrors.CannotActivateWithoutVariants);

        Status = isAvailable ? MealStatus.Active : MealStatus.Draft;
        return Result.Success();
    }

    // ── Archiving (Active/Draft → Archived) ───────────────────────────────────

    /// <summary>
    /// Archives the meal. The command handler is responsible for checking
    /// that no active/pending orders reference this meal before calling this.
    /// </summary>
    public Result Archive(DateTime archivedAt)
    {
        if (Status == MealStatus.Archived)
            return Result.Failure(MealErrors.AlreadyArchived);

        Status = MealStatus.Archived;
        ArchivedAt = archivedAt;
        return Result.Success();
    }

    /// <summary>
    /// Restores an archived meal back to Draft.
    /// </summary>
    public Result Restore()
    {
        if (Status != MealStatus.Archived)
            return Result.Failure(MealErrors.NotArchived);

        Status = MealStatus.Draft;
        ArchivedAt = null;
        return Result.Success();
    }

    // ── Variants ──────────────────────────────────────────────────────────────

    public Result<MealVariant> AddVariant(string name, Money price)
    {
        if (Status == MealStatus.Archived)
            return Result.Failure<MealVariant>(MealErrors.CannotModifyArchivedMeal);

        bool nameExists = _variants.Any(v =>
            v.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        if (nameExists)
            return Result.Failure<MealVariant>(MealErrors.VariantNameAlreadyExists(name));

        bool isDefault = _variants.Count == 0;
        var variant = MealVariant.Create(Id, name, price, isDefault);
        _variants.Add(variant);
        return Result.Success(variant);
    }

    public Result UpdateVariant(Guid variantId, string name, Money price)
    {
        if (Status == MealStatus.Archived)
            return Result.Failure(MealErrors.CannotModifyArchivedMeal);

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
        if (Status == MealStatus.Archived)
            return Result.Failure(MealErrors.CannotModifyArchivedMeal);

        if (_variants.Count == 1)
            return Result.Failure(MealErrors.CannotRemoveLastVariant);

        var variant = _variants.FirstOrDefault(v => v.Id == variantId);
        if (variant is null)
            return Result.Failure(MealErrors.VariantNotFound(variantId));

        // Auto-promote the next variant if we're removing the default
        if (variant.IsDefault)
        {
            var next = _variants.First(v => v.Id != variantId);
            next.SetAsDefault();
        }

        _variants.Remove(variant);
        return Result.Success();
    }

    public Result SetDefaultVariant(Guid variantId)
    {
        if (Status == MealStatus.Archived)
            return Result.Failure(MealErrors.CannotModifyArchivedMeal);

        var variant = _variants.FirstOrDefault(v => v.Id == variantId);
        if (variant is null)
            return Result.Failure(MealErrors.VariantNotFound(variantId));

        foreach (var v in _variants) v.ClearDefault();
        variant.SetAsDefault();
        return Result.Success();
    }

    public MealVariant? DefaultVariant =>
        _variants.FirstOrDefault(v => v.IsDefault);

    // ── Side dishes ───────────────────────────────────────────────────────────

    public Result<SideDish> AddSideDish(string name, string? description, Money price, bool isRequired)
    {
        if (Status == MealStatus.Archived)
            return Result.Failure<SideDish>(MealErrors.CannotModifyArchivedMeal);

        bool nameExists = _sideDishes.Any(s =>
            s.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        if (nameExists)
            return Result.Failure<SideDish>(MealErrors.SideDishNameAlreadyExists(name));

        var sideDish = SideDish.Create(Id, name, description, price, isRequired);
        _sideDishes.Add(sideDish);
        return Result.Success(sideDish);
    }

    public Result RemoveSideDish(Guid sideDishId)
    {
        if (Status == MealStatus.Archived)
            return Result.Failure(MealErrors.CannotModifyArchivedMeal);

        var sideDish = _sideDishes.FirstOrDefault(s => s.Id == sideDishId);
        if (sideDish is null)
            return Result.Failure(MealErrors.SideDishNotFound(sideDishId));

        _sideDishes.Remove(sideDish);
        return Result.Success();
    }

    // ── Topping groups ────────────────────────────────────────────────────────

    public Result<ToppingGroup> AddToppingGroup(string name, int minSelections, int maxSelections)
    {
        if (Status == MealStatus.Archived)
            return Result.Failure<ToppingGroup>(MealErrors.CannotModifyArchivedMeal);

        bool nameExists = _toppingGroups.Any(g =>
            g.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        if (nameExists)
            return Result.Failure<ToppingGroup>(MealErrors.ToppingGroupNameAlreadyExists(name));

        var result = ToppingGroup.Create(Id, name, minSelections, maxSelections);
        if (result.IsFailure)
            return Result.Failure<ToppingGroup>(result.Error);

        _toppingGroups.Add(result.Value);
        return result;
    }

    public Result RemoveToppingGroup(Guid toppingGroupId)
    {
        if (Status == MealStatus.Archived)
            return Result.Failure(MealErrors.CannotModifyArchivedMeal);

        var group = _toppingGroups.FirstOrDefault(g => g.Id == toppingGroupId);
        if (group is null)
            return Result.Failure(MealErrors.ToppingGroupNotFound(toppingGroupId));

        _toppingGroups.Remove(group);
        return Result.Success();
    }

    public Result AddToppingOption(Guid toppingGroupId, string name, Money extraPrice)
    {
        if (Status == MealStatus.Archived)
            return Result.Failure(MealErrors.CannotModifyArchivedMeal);

        var group = _toppingGroups.FirstOrDefault(g => g.Id == toppingGroupId);
        if (group is null)
            return Result.Failure(MealErrors.ToppingGroupNotFound(toppingGroupId));

        return group.AddOption(name, extraPrice);
    }

    public Result RemoveToppingOption(Guid toppingGroupId, Guid optionId)
    {
        if (Status == MealStatus.Archived)
            return Result.Failure(MealErrors.CannotModifyArchivedMeal);

        var group = _toppingGroups.FirstOrDefault(g => g.Id == toppingGroupId);
        if (group is null)
            return Result.Failure(MealErrors.ToppingGroupNotFound(toppingGroupId));

        return group.RemoveOption(optionId);
    }

    // ── Order validation ──────────────────────────────────────────────────────

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
                .Distinct()
                .ToList();

            var result = group.ValidateSelections(selectionsForGroup);
            if (result.IsFailure)
                return result;
        }

        return Result.Success();
    }
}