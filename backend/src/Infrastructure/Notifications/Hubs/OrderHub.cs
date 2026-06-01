using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Users.UpdateDeliveryManLocation;
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
///
/// Delivery men also send their GPS position through this hub via UpdateLocation,
/// reusing the already-open WebSocket instead of a separate HTTP request per update.
/// The write path is identical to DeliveryLocationController — both funnel through
/// UpdateDeliveryManLocationCommand → IDeliveryPositionCache → pg_notify trigger.
/// </summary>
[Authorize]
public sealed class DeliveryHub(
    ICommandHandler<UpdateDeliveryManLocationCommand> updateLocationHandler,
    ITrackingTokenService trackingTokenService) : Hub
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
    /// Customer subscribes to live GPS updates for a specific order.
    /// Requires a short-lived HMAC token obtained from
    /// GET /api/customer/orders/{orderId}/tracking-token.
    ///
    /// The token encodes (userId, orderId, expiry) and is verified without a DB hit.
    /// The embedded userId must match the authenticated connection — prevents one
    /// customer from using another customer's token.
    /// </summary>
    public async Task TrackOrder(string orderId, string trackingToken)
    {
        if (!trackingTokenService.ValidateToken(trackingToken, out Guid tokenUserId, out Guid tokenOrderId))
        {
            Context.Abort();
            return;
        }

        // Ensure the token was issued for the caller, not a different user
        if (tokenUserId.ToString() != Context.UserIdentifier)
        {
            Context.Abort();
            return;
        }

        // Ensure the token's orderId matches the group being joined
        if (tokenOrderId.ToString() != orderId)
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, $"order-{orderId}");
    }

    /// <summary>
    /// Customer leaves the tracking group when they close the tracking screen.
    /// </summary>
    public async Task StopTrackingOrder(string orderId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"order-{orderId}");
    }

    /// <summary>
    /// Called by the delivery man client on a periodic interval (e.g. every 3–5 s).
    /// Reuses the open WebSocket instead of a separate HTTP request per GPS tick.
    ///
    /// The activeOrderId is intentionally NOT accepted from the client here — the
    /// command handler resolves the active order server-side from DeliveryTracking
    /// to prevent a compromised client routing GPS spam to arbitrary orders.
    /// </summary>
    public async Task UpdateLocation(
        double latitude,
        double longitude,
        double? headingDegrees,
        double? speedKmh)
    {
        if (!Context.User!.IsInRole("DeliveryMan"))
            return;

        var command = new UpdateDeliveryManLocationCommand(
            latitude,
            longitude,
            headingDegrees,
            speedKmh);

        // Result is intentionally not forwarded back to the client —
        // GPS updates are fire-and-forget. Validation errors are silent
        // since a single bad GPS tick is not worth disrupting the connection.
        await updateLocationHandler.Handle(command, Context.ConnectionAborted);
    }
}
