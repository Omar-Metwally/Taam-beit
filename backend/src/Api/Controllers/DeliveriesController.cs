using Api.Extensions;
using Application.Abstractions.Messaging;
using Application.Deliveries.AcceptDelivery;
using Application.Deliveries.GetActiveDelivery;
using Application.Deliveries.MarkDelivered;
using Application.Deliveries.MarkPickedUp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/deliveries")]
[Authorize(Roles = "DeliveryMan")]
public sealed class DeliveriesController(
    ICommandHandler<AcceptDeliveryCommand> acceptHandler,
    ICommandHandler<MarkPickedUpCommand> pickedUpHandler,
    ICommandHandler<MarkDeliveredCommand> deliveredHandler,
    IQueryHandler<GetActiveDeliveryQuery, ActiveDeliveryResponse> getActiveHandler)
    : ControllerBase
{
    [HttpPost("{orderId:guid}/accept")]
    public async Task<IActionResult> AcceptDelivery(
        Guid orderId,
        CancellationToken ct) =>
        (await acceptHandler.Handle(new AcceptDeliveryCommand(orderId), ct))
            .ToActionResult();

    [HttpPut("{deliveryTrackingId:guid}/picked-up")]
    public async Task<IActionResult> MarkPickedUp(
        Guid deliveryTrackingId,
        CancellationToken ct) =>
        (await pickedUpHandler.Handle(new MarkPickedUpCommand(deliveryTrackingId), ct))
            .ToActionResult();

    [HttpPut("{deliveryTrackingId:guid}/delivered")]
    public async Task<IActionResult> MarkDelivered(
        Guid deliveryTrackingId,
        CancellationToken ct) =>
        (await deliveredHandler.Handle(new MarkDeliveredCommand(deliveryTrackingId), ct))
            .ToActionResult();

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveDelivery(CancellationToken ct) =>
        (await getActiveHandler.Handle(new GetActiveDeliveryQuery(), ct))
            .ToActionResult();
}
