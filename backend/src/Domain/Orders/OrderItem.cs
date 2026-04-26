using Domain.Common;
using SharedKernel;

namespace Domain.Orders;

public sealed class OrderItem : Entity
{
    public Guid Id { get; private set; }
    public Guid OrderId { get; private set; }
    public Guid MealId { get; private set; }

    // ── Price snapshots (frozen at order time) ────────────────────────────────
    public string MealName { get; private set; }

    /// <summary>The specific variant the customer chose (e.g. "Large").</summary>
    public Guid MealVariantId { get; private set; }

    /// <summary>Snapshot of the variant name at order time.</summary>
    public string VariantName { get; private set; }

    /// <summary>
    /// Snapshot of the variant's price at order time.
    /// Frozen so future price changes never affect this order.
    /// </summary>
    public Money VariantPrice { get; private set; }

    public int Quantity { get; private set; }

    private readonly List<SelectedSideDishSnapshot> _sideDishes = [];
    public IReadOnlyList<SelectedSideDishSnapshot> SideDishes => _sideDishes.AsReadOnly();

    private readonly List<SelectedToppingSnapshot> _toppings = [];
    public IReadOnlyList<SelectedToppingSnapshot> Toppings => _toppings.AsReadOnly();

    private OrderItem() { }

    internal static OrderItem Create(
        Guid orderId,
        Guid mealId,
        string mealName,
        Guid mealVariantId,
        string variantName,
        Money variantPrice,
        int quantity,
        IEnumerable<SelectedSideDishSnapshot> sideDishes,
        IEnumerable<SelectedToppingSnapshot> toppings)
    {
        var item = new OrderItem
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            MealId = mealId,
            MealName = mealName,
            MealVariantId = mealVariantId,
            VariantName = variantName,
            VariantPrice = variantPrice,
            Quantity = quantity
        };

        item._sideDishes.AddRange(sideDishes);
        item._toppings.AddRange(toppings);

        return item;
    }

    /// <summary>
    /// Total for this line: (variantPrice + sideDish prices + topping extras) × quantity.
    /// </summary>
    public Money LineTotal
    {
        get
        {
            var unitPrice = VariantPrice;

            foreach (var side in _sideDishes)
                unitPrice = unitPrice.Add(side.Price);

            foreach (var topping in _toppings)
                unitPrice = unitPrice.Add(topping.ExtraPrice);

            return unitPrice.Multiply(Quantity);
        }
    }
}
