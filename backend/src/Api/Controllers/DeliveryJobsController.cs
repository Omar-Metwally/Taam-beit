using Api.Extensions;
using Application.Abstractions.Messaging;
using Application.Deliveries.AcceptDelivery;
using Application.Deliveries.GetActiveDelivery;
using Application.Deliveries.GetAvailableDeliveries;
using Application.Deliveries.MarkDelivered;
using Application.Deliveries.MarkPickedUp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

/// <summary>
/// Delivery man operations — accept jobs, update pickup/delivery status.
/// All endpoints require DeliveryMan role.
/// </summary>
[ApiController]
[Route("api/delivery/jobs")]
[Authorize(Roles = "DeliveryMan")]
public sealed class DeliveryJobsController(
    IQueryHandler<GetAvailableDeliveriesQuery, IReadOnlyList<AvailableDeliveryResponse>> getAvailableHandler,
    ICommandHandler<AcceptDeliveryCommand> acceptHandler,
    ICommandHandler<MarkPickedUpCommand> pickedUpHandler,
    ICommandHandler<MarkDeliveredCommand> deliveredHandler,
    IQueryHandler<GetActiveDeliveryQuery, ActiveDeliveryResponse> getActiveHandler)
    : ControllerBase
{
    /// <summary>
    /// Returns all orders currently awaiting pickup within the driver range (ReadyForPickup, no driver assigned).
    /// Called once on hub connect to hydrate the available orders list.
    /// Subsequent additions arrive via the NewDeliveryAvailable SignalR push — no polling needed.
    /// </summary>
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailableDeliveries(
    CancellationToken ct,
    double? Latitude = null,
    double? Longitude = null,
    double RadiusKm = 50) =>
        (await getAvailableHandler.Handle(new GetAvailableDeliveriesQuery(Latitude: Latitude, Longitude: Longitude, RadiusKm), ct))
            .ToActionResult();

    /// <summary>
    /// Get the delivery man's currently active delivery (if any).
    /// </summary>
    [HttpGet("active")]
    public async Task<IActionResult> GetActiveDelivery(CancellationToken ct) =>
        (await getActiveHandler.Handle(new GetActiveDeliveryQuery(), ct))
            .ToActionResult();

    /// <summary>
    /// Accept an available delivery job.
    /// </summary>
    [HttpPost("{orderId:guid}/accept")]
    public async Task<IActionResult> AcceptDelivery(
        Guid orderId,
        CancellationToken ct) =>
        (await acceptHandler.Handle(new AcceptDeliveryCommand(orderId), ct))
            .ToActionResult();

    /// <summary>
    /// Mark the order as picked up from the chef.
    /// </summary>
    [HttpPut("{deliveryTrackingId:guid}/picked-up")]
    public async Task<IActionResult> MarkPickedUp(
        Guid deliveryTrackingId,
        CancellationToken ct) =>
        (await pickedUpHandler.Handle(new MarkPickedUpCommand(deliveryTrackingId), ct))
            .ToActionResult();

    /// <summary>
    /// Mark the order as delivered to the customer.
    /// </summary>
    [HttpPut("{deliveryTrackingId:guid}/delivered")]
    public async Task<IActionResult> MarkDelivered(
        Guid deliveryTrackingId,
        CancellationToken ct) =>
        (await deliveredHandler.Handle(new MarkDeliveredCommand(deliveryTrackingId), ct))
            .ToActionResult();
}
