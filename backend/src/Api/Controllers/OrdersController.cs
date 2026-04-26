using Api.Extensions;
using Application.Abstractions.Messaging;
using Application.Orders.CancelOrder;
using Application.Orders.ConfirmOrder;
using Application.Orders.GetMyOrders;
using Application.Orders.GetOrderById;
using Application.Orders.MarkOrderReadyForPickup;
using Application.Orders.PlaceOrder;
using Application.Orders.RejectOrder;
using Application.Orders.StartPreparingOrder;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public sealed class OrdersController(
    ICommandHandler<PlaceOrderCommand, Guid> placeOrderHandler,
    ICommandHandler<CancelOrderCommand> cancelOrderHandler,
    ICommandHandler<ConfirmOrderCommand> confirmOrderHandler,
    ICommandHandler<RejectOrderCommand> rejectOrderHandler,
    ICommandHandler<StartPreparingOrderCommand> startPreparingHandler,
    ICommandHandler<MarkOrderReadyForPickupCommand> readyForPickupHandler,
    IQueryHandler<GetOrderByIdQuery, OrderDetailResponse> getByIdHandler,
    IQueryHandler<GetMyOrdersQuery, List<OrderSummaryResponse>> getMyOrdersHandler)
    : ControllerBase
{
    // ── Customer ──────────────────────────────────────────────────────────────

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
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default) =>
        (await getMyOrdersHandler.Handle(new GetMyOrdersQuery(page, pageSize), ct))
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

    // ── Chef ──────────────────────────────────────────────────────────────────

    [HttpPut("{orderId:guid}/confirm")]
    [Authorize(Roles = "Chef")]
    public async Task<IActionResult> ConfirmOrder(
        Guid orderId,
        CancellationToken ct) =>
        (await confirmOrderHandler.Handle(new ConfirmOrderCommand(orderId), ct))
            .ToActionResult();

    [HttpPut("{orderId:guid}/reject")]
    [Authorize(Roles = "Chef")]
    public async Task<IActionResult> RejectOrder(
        Guid orderId,
        [FromBody] string reason,
        CancellationToken ct) =>
        (await rejectOrderHandler.Handle(new RejectOrderCommand(orderId, reason), ct))
            .ToActionResult();

    [HttpPut("{orderId:guid}/start-preparing")]
    [Authorize(Roles = "Chef")]
    public async Task<IActionResult> StartPreparing(
        Guid orderId,
        CancellationToken ct) =>
        (await startPreparingHandler.Handle(new StartPreparingOrderCommand(orderId), ct))
            .ToActionResult();

    [HttpPut("{orderId:guid}/ready-for-pickup")]
    [Authorize(Roles = "Chef")]
    public async Task<IActionResult> MarkReadyForPickup(
        Guid orderId,
        CancellationToken ct) =>
        (await readyForPickupHandler.Handle(new MarkOrderReadyForPickupCommand(orderId), ct))
            .ToActionResult();
}
