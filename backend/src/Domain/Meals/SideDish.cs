using Domain.Common;
using SharedKernel;

namespace Domain.Meals;

public sealed class SideDish : Entity
{
    public Guid Id { get; private set; }
    public Guid MealId { get; private set; }
    public string Name { get; private set; }
    public string? Description { get; private set; }
    public Money Price { get; private set; }

    /// <summary>
    /// When true, the customer must select this side dish to proceed.
    /// When false, it is an optional add-on.
    /// </summary>
    public bool IsRequired { get; private set; }

    private SideDish() { }

    internal static SideDish Create(
        Guid mealId,
        string name,
        string? description,
        Money price,
        bool isRequired)
    {
        return new SideDish
        {
            Id = Guid.NewGuid(),
            MealId = mealId,
            Name = name,
            Description = description,
            Price = price,
            IsRequired = isRequired
        };
    }

    internal Result Update(string name, string? description, Money price, bool isRequired)
    {
        Name = name;
        Description = description;
        Price = price;
        IsRequired = isRequired;
        return Result.Success();
    }
}
