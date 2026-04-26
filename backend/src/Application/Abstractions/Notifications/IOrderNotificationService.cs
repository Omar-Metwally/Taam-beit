namespace Application.Abstractions.Notifications;

/// <summary>
/// Abstracts SignalR hub calls so Application layer stays decoupled
/// from the SignalR infrastructure.
/// Two logical hubs map to this interface:
///   OrderHub  — order status updates for customer and chef
///   DeliveryHub — delivery notifications for delivery men and customers
/// </summary>
public interface IOrderNotificationService
{
    /// <summary>
    /// Notifies the chef that a new order has been placed and awaits confirmation.
    /// SignalR group: "chef-{chefId}"
    /// </summary>
    Task NotifyChefNewOrderAsync(Guid chefId, Guid orderId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Notifies the customer of any order status change.
    /// SignalR group: "customer-{customerId}"
    /// </summary>
    Task NotifyCustomerOrderStatusAsync(Guid customerId, Guid orderId, string newStatus, CancellationToken cancellationToken = default);

    /// <summary>
    /// Broadcasts a new available order to a list of nearby delivery men.
    /// SignalR group: "deliveryman-{deliveryManId}" for each ID.
    /// Called by OrderReadyForPickupDomainEventHandler after H3 proximity lookup.
    /// </summary>
    Task NotifyNearbyDeliveryMenAsync(IReadOnlyList<Guid> deliveryManIds, Guid orderId, Guid chefId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Notifies the customer that their delivery man's location has been updated.
    /// SignalR group: "order-{orderId}"
    /// This is called from the GpsNotifyListenerService (Infrastructure) directly —
    /// included here for completeness and testability.
    /// </summary>
    Task NotifyCustomerDriverLocationAsync(Guid orderId, double latitude, double longitude, double? heading, CancellationToken cancellationToken = default);
}
