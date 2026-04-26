using Domain.Common;
using SharedKernel;

namespace Domain.Meals;

/// <summary>
/// Represents a size or format variant of a meal (e.g. Small, Large, 500ml, Double).
/// Every Meal has at least one variant — created automatically in Meal.Create().
/// Exactly one variant must be marked IsDefault at all times.
/// Price lives here, not on Meal itself.
/// </summary>
public sealed class MealVariant : Entity
{
    public Guid Id { get; private set; }
    public Guid MealId { get; private set; }

    /// <summary>
    /// Human-readable size label set by the chef.
    /// Examples: "Regular", "Large", "500ml", "Double patty"
    /// </summary>
    public string Name { get; private set; }

    public Money Price { get; private set; }

    /// <summary>
    /// The variant shown by default in meal listings.
    /// Exactly one variant per meal carries this flag.
    /// </summary>
    public bool IsDefault { get; private set; }

    private MealVariant() { }

    internal static MealVariant Create(Guid mealId, string name, Money price, bool isDefault)
    {
        return new MealVariant
        {
            Id = Guid.NewGuid(),
            MealId = mealId,
            Name = name,
            Price = price,
            IsDefault = isDefault
        };
    }

    internal void SetAsDefault() => IsDefault = true;
    internal void ClearDefault() => IsDefault = false;

    internal Result Update(string name, Money price)
    {
        Name = name;
        Price = price;
        return Result.Success();
    }
}
