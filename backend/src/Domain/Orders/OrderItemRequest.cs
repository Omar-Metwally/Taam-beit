namespace Domain.Orders;

/// <summary>
/// Carries the customer's selections for a single meal when placing an order.
/// MealVariantId is required — every meal has at least one variant.
/// </summary>
public sealed class OrderItemRequest
{
    public Guid MealId { get; init; }
    public Guid MealVariantId { get; init; }
    public int Quantity { get; init; }
    public IReadOnlyList<Guid> SelectedSideDishIds { get; init; } = [];
    public IReadOnlyList<Guid> SelectedToppingOptionIds { get; init; } = [];
}
