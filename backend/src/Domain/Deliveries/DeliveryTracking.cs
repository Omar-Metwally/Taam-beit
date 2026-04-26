using Domain.Common;
using SharedKernel;

namespace Domain.Deliveries;

/// <summary>
/// Tracks the lifecycle of a single delivery from acceptance to completion.
/// Created when a delivery man accepts a ReadyForPickup order.
/// Live GPS position is NOT stored here — it lives in cache_driver_positions (infrastructure).
/// This aggregate only tracks the business lifecycle: Assigned → PickedUp → Delivered.
/// </summary>
public sealed class DeliveryTracking : Entity
{
    public Guid Id { get; private set; }
    public Guid OrderId { get; private set; }

    /// <summary>UserId of the delivery man who accepted this delivery.</summary>
    public Guid DeliveryManId { get; private set; }

    /// <summary>Snapshot of the chef's operation location — where to pick up the order.</summary>
    public Location PickupLocation { get; private set; }

    /// <summary>Snapshot of the customer's delivery location — where to drop off.</summary>
    public Location DropoffLocation { get; private set; }

    public DeliveryStatus Status { get; private set; }
    public DateTime AcceptedAt { get; private set; }
    public DateTime? PickedUpAt { get; private set; }
    public DateTime? DeliveredAt { get; private set; }

    private DeliveryTracking() { }

    /// <summary>
    /// Called by the OrderAssignedToDeliveryManDomainEvent handler.
    /// Both location snapshots are passed in to freeze them at acceptance time.
    /// </summary>
    public static DeliveryTracking Create(
        Guid orderId,
        Guid deliveryManId,
        Location pickupLocation,
        Location dropoffLocation,
        DateTime acceptedAt)
    {
        var tracking = new DeliveryTracking
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            DeliveryManId = deliveryManId,
            PickupLocation = pickupLocation,
            DropoffLocation = dropoffLocation,
            Status = DeliveryStatus.Assigned,
            AcceptedAt = acceptedAt
        };

        tracking.Raise(new DeliveryAcceptedDomainEvent(tracking.Id, orderId, deliveryManId));

        return tracking;
    }

    /// <summary>
    /// Delivery man confirms they have picked up the order from the chef.
    /// </summary>
    public Result MarkPickedUp(DateTime pickedUpAt)
    {
        if (Status != DeliveryStatus.Assigned)
            return Result.Failure(DeliveryErrors.InvalidStatusTransition(Status, DeliveryStatus.PickedUp));

        Status = DeliveryStatus.PickedUp;
        PickedUpAt = pickedUpAt;

        Raise(new DeliveryPickedUpDomainEvent(Id, OrderId, DeliveryManId));

        return Result.Success();
    }

    /// <summary>
    /// Delivery man confirms the order has been handed to the customer.
    /// This also triggers Order.MarkDelivered in the Application layer.
    /// </summary>
    public Result MarkDelivered(DateTime deliveredAt)
    {
        if (Status != DeliveryStatus.PickedUp)
            return Result.Failure(DeliveryErrors.InvalidStatusTransition(Status, DeliveryStatus.Delivered));

        Status = DeliveryStatus.Delivered;
        DeliveredAt = deliveredAt;

        Raise(new DeliveryCompletedDomainEvent(Id, OrderId, DeliveryManId));

        return Result.Success();
    }
}
