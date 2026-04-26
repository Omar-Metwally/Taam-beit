using Domain.Common;
using SharedKernel;

namespace Domain.Meals;

public sealed class ToppingOption : Entity
{
    public Guid Id { get; private set; }
    public Guid ToppingGroupId { get; private set; }
    public string Name { get; private set; }

    /// <summary>
    /// Additional cost for selecting this option. Zero means no extra charge.
    /// </summary>
    public Money ExtraPrice { get; private set; }

    private ToppingOption() { }

    internal static ToppingOption Create(Guid toppingGroupId, string name, Money extraPrice)
    {
        return new ToppingOption
        {
            Id = Guid.NewGuid(),
            ToppingGroupId = toppingGroupId,
            Name = name,
            ExtraPrice = extraPrice
        };
    }

    internal Result Update(string name, Money extraPrice)
    {
        Name = name;
        ExtraPrice = extraPrice;
        return Result.Success();
    }
}
