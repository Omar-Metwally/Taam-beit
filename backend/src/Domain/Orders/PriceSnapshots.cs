using Domain.Common;

namespace Domain.Orders;

/// <summary>
/// Snapshot of a selected side dish at order time.
/// Frozen so future price changes on the meal don't affect this order.
/// </summary>
public sealed record SelectedSideDishSnapshot
{
    public Guid SideDishId { get; init; }
    public string Name { get; init; }
    public Money Price { get; init; }
}

/// <summary>
/// Snapshot of a selected topping option at order time.
/// Frozen so future price changes on the meal don't affect this order.
/// </summary>
public sealed record SelectedToppingSnapshot
{
    public Guid ToppingOptionId { get; init; }
    public string GroupName { get; init; }
    public string OptionName { get; init; }
    public Money ExtraPrice { get; init; }
}
