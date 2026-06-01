using Api.Extensions;
using Application.Abstractions.Messaging;
using Application.Orders.ConfirmOrderCommans;
using Application.Orders.GetChefOrders;
using Application.Orders.MarkOrderReadyForPickup;
using Application.Orders.RejectOrder;
using Application.Orders.StartPreparingOrder;
using Domain.Orders;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

/// <summary>
/// Chef order management — view incoming orders and update their status.
/// All endpoints require Chef role.
/// </summary>
[ApiController]
[Route("api/chef/orders")]
[Authorize(Roles = "Chef")]
public sealed class ChefOrdersController(
    ICommandHandler<ConfirmOrderCommand> confirmOrderHandler,
    ICommandHandler<RejectOrderCommand> rejectOrderHandler,
    ICommandHandler<StartPreparingOrderCommand> startPreparingHandler,
    ICommandHandler<MarkOrderReadyForPickupCommand> readyForPickupHandler,
    IQueryHandler<GetChefOrdersQuery, List<ChefOrderResponse>> getChefOrdersHandler)
    : ControllerBase
{
    /// <summary>
    /// Get all orders for the authenticated chef's meals.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetOrders(
        [FromQuery] OrderStatus? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default) =>
        (await getChefOrdersHandler.Handle(
            new GetChefOrdersQuery(page, pageSize, status), ct))
            .ToActionResult();

    [HttpPut("{orderId:guid}/confirm")]
    public async Task<IActionResult> ConfirmOrder(
        Guid orderId,
        CancellationToken ct) =>
        (await confirmOrderHandler.Handle(new ConfirmOrderCommand(orderId), ct))
            .ToActionResult();

    [HttpPut("{orderId:guid}/reject")]
    public async Task<IActionResult> RejectOrder(
        Guid orderId,
        [FromBody] string reason,
        CancellationToken ct) =>
        (await rejectOrderHandler.Handle(new RejectOrderCommand(orderId, reason), ct))
            .ToActionResult();

    [HttpPut("{orderId:guid}/start-preparing")]
    public async Task<IActionResult> StartPreparing(
        Guid orderId,
        CancellationToken ct) =>
        (await startPreparingHandler.Handle(new StartPreparingOrderCommand(orderId), ct))
            .ToActionResult();

    [HttpPut("{orderId:guid}/ready-for-pickup")]
    public async Task<IActionResult> MarkReadyForPickup(
        Guid orderId,
        CancellationToken ct) =>
        (await readyForPickupHandler.Handle(new MarkOrderReadyForPickupCommand(orderId), ct))
            .ToActionResult();
}
