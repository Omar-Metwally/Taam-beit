using Api.Extensions;
using Application.Abstractions.Messaging;
using Application.Orders.CancelOrder;
using Application.Orders.GetCustomerOrders;
using Application.Orders.GetOrderById;
using Application.Orders.GetTrackingToken;
using Application.Orders.PlaceOrder;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

/// <summary>
/// Customer order flow — place, view, and cancel their own orders.
/// All endpoints require authentication (any authenticated user).
/// </summary>
[ApiController]
[Route("api/customer/orders")]
[Authorize]
public sealed class CustomerOrdersController(
    ICommandHandler<PlaceOrderCommand, Guid> placeOrderHandler,
    ICommandHandler<CancelOrderCommand> cancelOrderHandler,
    IQueryHandler<GetOrderByIdQuery, OrderDetailResponse> getByIdHandler,
    IQueryHandler<GetCustomerOrdersQuery, List<CustomerOrderSummaryResponse>> getMyOrdersHandler,
    IQueryHandler<GetTrackingTokenQuery, TrackingTokenResponse> getTrackingTokenHandler)
    : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> PlaceOrder(
        [FromBody] PlaceOrderCommand command,
        CancellationToken ct)
    {
        var result = await placeOrderHandler.Handle(command, ct);
        return result.IsSuccess
            ? CreatedAtRoute("GetOrderById", new { orderId = result.Value }, new { orderId = result.Value })
            : result.ToActionResult();
    }

    [HttpGet(Name = "GetMyOrders")]
    public async Task<IActionResult> GetMyOrders(
        [FromQuery] int monthsBack = 1,
        CancellationToken ct = default) =>
        (await getMyOrdersHandler.Handle(new GetCustomerOrdersQuery(monthsBack), ct))
            .ToActionResult();

    [HttpGet("{orderId:guid}", Name = "GetOrderById")]
    public async Task<IActionResult> GetOrderById(
        Guid orderId,
        CancellationToken ct) =>
        (await getByIdHandler.Handle(new GetOrderByIdQuery(orderId), ct))
            .ToActionResult();

    [HttpDelete("{orderId:guid}")]
    public async Task<IActionResult> CancelOrder(
        Guid orderId,
        [FromBody] string? reason,
        CancellationToken ct) =>
        (await cancelOrderHandler.Handle(new CancelOrderCommand(orderId, reason), ct))
            .ToActionResult();

    /// <summary>
    /// Issues a short-lived HMAC token (5 min) authorising the caller to subscribe
    /// to live GPS updates for this order via DeliveryHub.TrackOrder.
    /// Only the customer who owns the order may call this endpoint.
    /// </summary>
    [HttpGet("{orderId:guid}/tracking-token")]
    public async Task<IActionResult> GetTrackingToken(
        Guid orderId,
        CancellationToken ct) =>
        (await getTrackingTokenHandler.Handle(new GetTrackingTokenQuery(orderId), ct))
            .ToActionResult();
}
