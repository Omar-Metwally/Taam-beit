using SharedKernel;

namespace Domain.Deliveries;

public sealed record DeliveryAcceptedDomainEvent(
    Guid DeliveryTrackingId,
    Guid OrderId,
    Guid DeliveryManId) : IDomainEvent;

public sealed record DeliveryPickedUpDomainEvent(
    Guid DeliveryTrackingId,
    Guid OrderId,
    Guid DeliveryManId) : IDomainEvent;

/// <summary>
/// Raised when the delivery man marks the order as delivered.
/// The Application layer handles this to call Order.MarkDelivered.
/// </summary>
public sealed record DeliveryCompletedDomainEvent(
    Guid DeliveryTrackingId,
    Guid OrderId,
    Guid DeliveryManId) : IDomainEvent;
