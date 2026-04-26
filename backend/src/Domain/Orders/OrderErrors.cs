using SharedKernel;

namespace Domain.Orders;

public static class OrderErrors
{
    public static Error NotFound(Guid orderId) => Error.NotFound(
        "Orders.NotFound",
        $"The order with Id = '{orderId}' was not found.");

    public static readonly Error EmptyOrder = Error.Problem(
        "Orders.EmptyOrder",
        "An order must contain at least one item.");

    public static readonly Error InvalidQuantity = Error.Problem(
        "Orders.InvalidQuantity",
        "Item quantity must be at least 1.");

    public static Error MealNotFound(Guid mealId) => Error.NotFound(
        "Orders.MealNotFound",
        $"The meal with Id = '{mealId}' was not found.");

    public static Error MealBelongsToDifferentChef(Guid mealId) => Error.Problem(
        "Orders.MealBelongsToDifferentChef",
        $"Meal '{mealId}' does not belong to the specified chef. An order can only contain meals from one chef.");

    public static Error InvalidStatusTransition(OrderStatus current, OrderStatus target) => Error.Problem(
        "Orders.InvalidStatusTransition",
        $"Cannot transition order from '{current}' to '{target}'.");

    public static readonly Error RejectionReasonRequired = Error.Problem(
        "Orders.RejectionReasonRequired",
        "A reason must be provided when rejecting an order.");

    public static readonly Error CannotCancelAfterPreparation = Error.Problem(
        "Orders.CannotCancelAfterPreparation",
        "The order cannot be cancelled once the chef has started preparing it.");

    public static readonly Error AlreadyAssigned = Error.Conflict(
        "Orders.AlreadyAssigned",
        "This order has already been assigned to a delivery man.");
}
