using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Infrastructure.Notifications.Hubs;

/// <summary>
/// Handles order status notifications.
/// Clients join groups based on their role:
///   - Customers join "customer-{userId}"
///   - Chefs join "chef-{userId}"
///
/// All messages are push-only from the server.
/// Clients connect on login and disconnect on logout.
/// </summary>
[Authorize]
public sealed class OrderHub : Hub
{
    /// <summary>
    /// Called by the client after connecting.
    /// Adds the connection to the appropriate groups based on JWT role claims.
    /// </summary>
    public async Task JoinUserGroups()
    {
        string userId = Context.UserIdentifier!;

        // Everyone joins their customer group
        await Groups.AddToGroupAsync(Context.ConnectionId, $"customer-{userId}");

        // Chefs additionally join their chef group
        if (Context.User!.IsInRole("Chef"))
            await Groups.AddToGroupAsync(Context.ConnectionId, $"chef-{userId}");
    }
}

/// <summary>
/// Handles live delivery tracking notifications.
/// Customers join "order-{orderId}" to receive GPS updates.
/// Delivery men join "deliveryman-{userId}" to receive order offers.
/// </summary>
[Authorize]
public sealed class DeliveryHub : Hub
{
    /// <summary>
    /// Delivery man joins their notification group on connect.
    /// </summary>
    public async Task JoinDeliveryManGroup()
    {
        if (!Context.User!.IsInRole("DeliveryMan"))
            return;

        string userId = Context.UserIdentifier!;
        await Groups.AddToGroupAsync(Context.ConnectionId, $"deliveryman-{userId}");
    }

    /// <summary>
    /// Customer joins the tracking group for a specific order.
    /// Called by the customer's app when they open the tracking screen.
    /// </summary>
    public async Task TrackOrder(string orderId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"order-{orderId}");
    }

    /// <summary>
    /// Customer leaves the tracking group when they close the tracking screen.
    /// </summary>
    public async Task StopTrackingOrder(string orderId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"order-{orderId}");
    }
}
