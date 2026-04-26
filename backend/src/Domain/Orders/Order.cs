using Domain.Common;
using Domain.Meals;
using SharedKernel;

namespace Domain.Orders;

public sealed class Order : Entity
{
    public Guid Id { get; private set; }
    public Guid CustomerId { get; private set; }
    public Guid ChefId { get; private set; }
    public Guid? DeliveryManId { get; private set; }
    public Location DeliveryLocation { get; private set; }
    public OrderStatus Status { get; private set; }
    public PaymentMethod PaymentMethod { get; private set; }
    public PaymentStatus PaymentStatus { get; private set; }
    public string? RejectionReason { get; private set; }
    public string? CancellationReason { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? ConfirmedAt { get; private set; }
    public DateTime? ReadyAt { get; private set; }
    public DateTime? DeliveredAt { get; private set; }

    private readonly List<OrderItem> _items = [];
    public IReadOnlyList<OrderItem> Items => _items.AsReadOnly();

    private Order() { }

    public static Result<Order> Create(
        Guid customerId,
        Guid chefId,
        Location deliveryLocation,
        PaymentMethod paymentMethod,
        IReadOnlyList<OrderItemRequest> itemRequests,
        IReadOnlyDictionary<Guid, Meal> mealsById,
        DateTime createdAt)
    {
        if (itemRequests.Count == 0)
            return Result.Failure<Order>(OrderErrors.EmptyOrder);

        foreach (var request in itemRequests)
        {
            if (!mealsById.TryGetValue(request.MealId, out var meal))
                return Result.Failure<Order>(OrderErrors.MealNotFound(request.MealId));

            if (meal.ChefId != chefId)
                return Result.Failure<Order>(OrderErrors.MealBelongsToDifferentChef(request.MealId));

            if (!meal.IsAvailable)
                return Result.Failure<Order>(MealErrors.NotAvailable);

            if (request.Quantity < 1)
                return Result.Failure<Order>(OrderErrors.InvalidQuantity);

            // Validate the chosen variant exists on this meal
            var variantResult = meal.ValidateVariantSelection(request.MealVariantId);
            if (variantResult.IsFailure)
                return Result.Failure<Order>(variantResult.Error);

            var sideDishResult = meal.ValidateSideDishSelections(request.SelectedSideDishIds);
            if (sideDishResult.IsFailure)
                return Result.Failure<Order>(sideDishResult.Error);

            var toppingResult = meal.ValidateToppingSelections(request.SelectedToppingOptionIds);
            if (toppingResult.IsFailure)
                return Result.Failure<Order>(toppingResult.Error);
        }

        var order = new Order
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ChefId = chefId,
            DeliveryLocation = deliveryLocation,
            Status = OrderStatus.Pending,
            PaymentMethod = paymentMethod,
            PaymentStatus = PaymentStatus.Pending,
            CreatedAt = createdAt
        };

        foreach (var request in itemRequests)
        {
            var meal = mealsById[request.MealId];
            var variant = meal.Variants.First(v => v.Id == request.MealVariantId);

            var sideDishSnapshots = request.SelectedSideDishIds
                .Select(id =>
                {
                    var sd = meal.SideDishes.First(s => s.Id == id);
                    return new SelectedSideDishSnapshot
                    {
                        SideDishId = sd.Id,
                        Name = sd.Name,
                        Price = sd.Price
                    };
                });

            var toppingSnapshots = request.SelectedToppingOptionIds
                .Select(id =>
                {
                    var group = meal.ToppingGroups.First(g => g.Options.Any(o => o.Id == id));
                    var option = group.Options.First(o => o.Id == id);
                    return new SelectedToppingSnapshot
                    {
                        ToppingOptionId = option.Id,
                        GroupName = group.Name,
                        OptionName = option.Name,
                        ExtraPrice = option.ExtraPrice
                    };
                });

            order._items.Add(OrderItem.Create(
                order.Id,
                meal.Id,
                meal.Name,
                variant.Id,
                variant.Name,
                variant.Price,
                request.Quantity,
                sideDishSnapshots,
                toppingSnapshots));
        }

        order.Raise(new OrderPlacedDomainEvent(order.Id, order.CustomerId, order.ChefId));

        return Result.Success(order);
    }

    // ── Status transitions ────────────────────────────────────────────────────

    public Result Confirm(DateTime confirmedAt)
    {
        if (Status != OrderStatus.Pending)
            return Result.Failure(OrderErrors.InvalidStatusTransition(Status, OrderStatus.Confirmed));

        Status = OrderStatus.Confirmed;
        ConfirmedAt = confirmedAt;

        Raise(new OrderConfirmedDomainEvent(Id, CustomerId, ChefId));
        return Result.Success();
    }

    public Result Reject(string reason)
    {
        if (Status != OrderStatus.Pending)
            return Result.Failure(OrderErrors.InvalidStatusTransition(Status, OrderStatus.Rejected));

        if (string.IsNullOrWhiteSpace(reason))
            return Result.Failure(OrderErrors.RejectionReasonRequired);

        Status = OrderStatus.Rejected;
        RejectionReason = reason;

        Raise(new OrderRejectedDomainEvent(Id, CustomerId, reason));
        return Result.Success();
    }

    public Result StartPreparing()
    {
        if (Status != OrderStatus.Confirmed)
            return Result.Failure(OrderErrors.InvalidStatusTransition(Status, OrderStatus.Preparing));

        Status = OrderStatus.Preparing;

        Raise(new OrderPreparingDomainEvent(Id, CustomerId, ChefId));
        return Result.Success();
    }

    public Result MarkReadyForPickup(DateTime readyAt)
    {
        if (Status != OrderStatus.Preparing)
            return Result.Failure(OrderErrors.InvalidStatusTransition(Status, OrderStatus.ReadyForPickup));

        Status = OrderStatus.ReadyForPickup;
        ReadyAt = readyAt;

        Raise(new OrderReadyForPickupDomainEvent(Id, CustomerId, ChefId, DeliveryLocation));
        return Result.Success();
    }

    public Result AssignDeliveryMan(Guid deliveryManId)
    {
        if (Status != OrderStatus.ReadyForPickup)
            return Result.Failure(OrderErrors.InvalidStatusTransition(Status, OrderStatus.OutForDelivery));

        if (DeliveryManId is not null)
            return Result.Failure(OrderErrors.AlreadyAssigned);

        DeliveryManId = deliveryManId;
        Status = OrderStatus.OutForDelivery;

        Raise(new OrderAssignedToDeliveryManDomainEvent(Id, CustomerId, ChefId, deliveryManId));
        return Result.Success();
    }

    public Result MarkDelivered(DateTime deliveredAt)
    {
        if (Status != OrderStatus.OutForDelivery)
            return Result.Failure(OrderErrors.InvalidStatusTransition(Status, OrderStatus.Delivered));

        Status = OrderStatus.Delivered;
        DeliveredAt = deliveredAt;

        Raise(new OrderDeliveredDomainEvent(Id, CustomerId, ChefId, DeliveryManId!.Value));
        return Result.Success();
    }

    public Result Cancel(string? reason)
    {
        if (Status is not (OrderStatus.Pending or OrderStatus.Confirmed))
            return Result.Failure(OrderErrors.CannotCancelAfterPreparation);

        Status = OrderStatus.Cancelled;
        CancellationReason = reason;

        Raise(new OrderCancelledDomainEvent(Id, CustomerId, ChefId));
        return Result.Success();
    }

    // ── Computed ──────────────────────────────────────────────────────────────

    public Money Total => _items.Aggregate(
        Money.Zero(_items.FirstOrDefault()?.VariantPrice.Currency ?? "USD"),
        (acc, item) => acc.Add(item.LineTotal));
}
