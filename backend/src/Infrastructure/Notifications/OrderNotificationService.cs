using Application.Abstractions.Notifications;
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
        Guid orderId,
        Guid chefId,
        CancellationToken cancellationToken = default)
    {
        // Fan-out: send to each delivery man's personal group concurrently
        var tasks = deliveryManIds.Select(id =>
            deliveryHub.Clients
                .Group($"deliveryman-{id}")
                .SendAsync("NewDeliveryAvailable", new { orderId, chefId }, cancellationToken));

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
