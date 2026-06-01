using Application.Abstractions.Notifications;
using Application.Deliveries.GetAvailableDeliveries;
using Infrastructure.Notifications.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace Infrastructure.Notifications;

internal sealed class OrderNotificationService(
    IHubContext<OrderHub> orderHub,
    IHubContext<DeliveryHub> deliveryHub) : IOrderNotificationService
{
    public async Task NotifyChefNewOrderAsync(
        Guid chefId,
        Guid orderId,
        CancellationToken cancellationToken = default)
    {
        await orderHub.Clients
            .Group($"chef-{chefId}")
            .SendAsync("NewOrderReceived", new { orderId }, cancellationToken);
    }

    public async Task NotifyCustomerOrderStatusAsync(
        Guid customerId,
        Guid orderId,
        string newStatus,
        CancellationToken cancellationToken = default)
    {
        await orderHub.Clients
            .Group($"customer-{customerId}")
            .SendAsync("OrderStatusChanged", new { orderId, newStatus }, cancellationToken);
    }

    public async Task NotifyNearbyDeliveryMenAsync(
        IReadOnlyList<Guid> deliveryManIds,
        AvailableDeliveryResponse order,
        CancellationToken cancellationToken = default)
    {
        // Fat notification — full order payload sent in the push.
        // Each driver renders the card immediately with no follow-up REST call.
        // Fan-out is concurrent; Task.WhenAll keeps latency flat regardless of driver count.
        var tasks = deliveryManIds.Select(id =>
            deliveryHub.Clients
                .Group($"deliveryman-{id}")
                .SendAsync("NewDeliveryAvailable", order, cancellationToken));

        await Task.WhenAll(tasks);
    }

    public async Task NotifyCustomerDriverLocationAsync(
        Guid orderId,
        double latitude,
        double longitude,
        double? heading,
        CancellationToken cancellationToken = default)
    {
        await deliveryHub.Clients
            .Group($"order-{orderId}")
            .SendAsync("DriverLocationUpdated",
                new { orderId, latitude, longitude, heading },
                cancellationToken);
    }
}
