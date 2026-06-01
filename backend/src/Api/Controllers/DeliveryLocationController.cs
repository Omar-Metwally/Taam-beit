using Api.Extensions;
using Application.Abstractions.Messaging;
using Application.Users.UpdateDeliveryManLocation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

/// <summary>
/// Delivery man GPS location updates — lightweight, no EF, direct cache write.
/// </summary>
[ApiController]
[Route("api/delivery/location")]
[Authorize(Roles = "DeliveryMan")]
public sealed class DeliveryLocationController(
    ICommandHandler<UpdateDeliveryManLocationCommand> updateLocationHandler)
    : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> UpdateLocation(
        [FromBody] UpdateDeliveryManLocationCommand command,
        CancellationToken ct) =>
        (await updateLocationHandler.Handle(command, ct)).ToActionResult();
}
