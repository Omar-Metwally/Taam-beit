using Domain.Common;
using SharedKernel;

namespace Domain.Orders;

public sealed record OrderPlacedDomainEvent(
    Guid OrderId,
    Guid CustomerId,
    Guid ChefId) : IDomainEvent;

public sealed record OrderConfirmedDomainEvent(
    Guid OrderId,
    Guid CustomerId,
    Guid ChefId) : IDomainEvent;

public sealed record OrderRejectedDomainEvent(
    Guid OrderId,
    Guid CustomerId,
    string Reason) : IDomainEvent;

public sealed record OrderPreparingDomainEvent(
    Guid OrderId,
    Guid CustomerId,
    Guid ChefId) : IDomainEvent;

/// <summary>
/// Raised when the chef marks the order ready for pickup.
/// Handler runs the H3 proximity lookup for nearby delivery men
/// AND notifies the customer — both via the outbox guarantee.
/// </summary>
public sealed record OrderReadyForPickupDomainEvent(
    Guid OrderId,
    Guid CustomerId,
    Guid ChefId,
    Location ChefLocation) : IDomainEvent;

/// <summary>
/// Raised when a delivery man accepts the order.
/// Handler creates the DeliveryTracking aggregate and notifies the customer.
/// </summary>
public sealed record OrderAssignedToDeliveryManDomainEvent(
    Guid OrderId,
    Guid CustomerId,
    Guid ChefId,
    Guid DeliveryManId) : IDomainEvent;

public sealed record OrderDeliveredDomainEvent(
    Guid OrderId,
    Guid CustomerId,
    Guid ChefId,
    Guid DeliveryManId) : IDomainEvent;

public sealed record OrderCancelledDomainEvent(
    Guid OrderId,
    Guid CustomerId,
    Guid ChefId) : IDomainEvent;
