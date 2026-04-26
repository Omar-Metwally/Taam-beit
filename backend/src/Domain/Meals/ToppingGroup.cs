using SharedKernel;

using Domain.Common;

namespace Domain.Meals;

/// <summary>
/// A named group of topping options with min/max selection rules.
/// Examples:
///   "Spice level"   min=1 max=1  → customer must pick exactly one
///   "Extras"        min=0 max=3  → optional, up to 3 selections
///   "Sauce"         min=1 max=2  → required, pick 1 or 2
/// </summary>
public sealed class ToppingGroup : Entity
{
    public Guid Id { get; private set; }
    public Guid MealId { get; private set; }
    public string Name { get; private set; }
    public int MinSelections { get; private set; }
    public int MaxSelections { get; private set; }

    private readonly List<ToppingOption> _options = [];
    public IReadOnlyList<ToppingOption> Options => _options.AsReadOnly();

    private ToppingGroup() { }

    internal static Result<ToppingGroup> Create(Guid mealId, string name, int min, int max)
    {
        if (min < 0)
            return Result.Failure<ToppingGroup>(ToppingGroupErrors.NegativeMin);

        if (max < 1)
            return Result.Failure<ToppingGroup>(ToppingGroupErrors.MaxTooLow);

        if (min > max)
            return Result.Failure<ToppingGroup>(ToppingGroupErrors.MinExceedsMax);

        return Result.Success(new ToppingGroup
        {
            Id = Guid.NewGuid(),
            MealId = mealId,
            Name = name,
            MinSelections = min,
            MaxSelections = max
        });
    }

    internal Result AddOption(string name, Money extraPrice)
    {
        var option = ToppingOption.Create(Id, name, extraPrice);
        _options.Add(option);
        return Result.Success();
    }

    internal Result RemoveOption(Guid optionId)
    {
        var option = _options.FirstOrDefault(o => o.Id == optionId);
        if (option is null)
            return Result.Failure(ToppingGroupErrors.OptionNotFound(optionId));

        _options.Remove(option);
        return Result.Success();
    }

    /// <summary>
    /// Validates that a given set of selected option IDs satisfies the min/max rules.
    /// </summary>
    public Result ValidateSelections(IReadOnlyList<Guid> selectedOptionIds)
    {
        // Ensure all selected IDs actually belong to this group
        var validIds = _options.Select(o => o.Id).ToHashSet();
        var invalidSelections = selectedOptionIds.Where(id => !validIds.Contains(id)).ToList();
        if (invalidSelections.Count > 0)
            return Result.Failure(ToppingGroupErrors.InvalidOptions(Id));

        int count = selectedOptionIds.Count;

        if (count < MinSelections)
            return Result.Failure(ToppingGroupErrors.BelowMinSelections(Name, MinSelections));

        if (count > MaxSelections)
            return Result.Failure(ToppingGroupErrors.AboveMaxSelections(Name, MaxSelections));

        return Result.Success();
    }

    public bool IsRequired => MinSelections > 0;
}
