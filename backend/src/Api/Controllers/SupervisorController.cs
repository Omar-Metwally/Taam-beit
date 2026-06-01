using Api.Extensions;
using Application.Abstractions.Messaging;
using Application.Users.ApproveChefProfile;
using Application.Users.ApproveDeliveryManProfile;
using Application.Users.GetChefApplications;
using Application.Users.GetChefDocumentUrl;
using Application.Users.GetDeliveryManApplications;
using Application.Users.RejectChefProfile;
using Application.Users.RejectDeliveryManProfile;
using Application.Users.UploadChefDocument;
using Domain.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

/// <summary>
/// Supervisor/admin operations — review and approve/reject chef and delivery man applications.
/// All endpoints require Supervisor role.
/// </summary>
[ApiController]
[Route("api/supervisor")]
//[Authorize(Roles = "Supervisor")]
public sealed class SupervisorController(
    ICommandHandler<ApproveChefProfileCommand> approveChefHandler,
    ICommandHandler<RejectChefProfileCommand> rejectChefHandler,
    ICommandHandler<ApproveDeliveryManProfileCommand> approveDeliveryManHandler,
    ICommandHandler<RejectDeliveryManProfileCommand> rejectDeliveryManHandler,
    IQueryHandler<GetChefApplicationsQuery, List<ChefApplicationResponse>> getChefApplicationsHandler,
    IQueryHandler<GetDeliveryManApplicationsQuery, List<DeliveryManApplicationResponse>> getDeliveryManApplicationsHandler,
    IQueryHandler<GetChefDocumentUrlQuery, string> getChiefDocumentUrlHandler)
    : ControllerBase
{
    // ── Chef Applications ────────────────────────────────────────────────────

    [HttpGet("chef-applications")]
    public async Task<IActionResult> GetChefApplications(
        [FromQuery] ProfileStatus? status,
        CancellationToken ct) =>
        (await getChefApplicationsHandler.Handle(
            new GetChefApplicationsQuery(status), ct))
            .ToActionResult();

    [HttpPut("chef-applications/{targetUserId:guid}/approve")]
    public async Task<IActionResult> ApproveChef(
        Guid targetUserId,
        CancellationToken ct) =>
        (await approveChefHandler.Handle(new ApproveChefProfileCommand(targetUserId), ct))
            .ToActionResult();

    [HttpPut("chef-applications/{targetUserId:guid}/reject")]
    public async Task<IActionResult> RejectChef(
        Guid targetUserId,
        [FromBody] string reason,
        CancellationToken ct) =>
        (await rejectChefHandler.Handle(new RejectChefProfileCommand(targetUserId, reason), ct))
            .ToActionResult();

    [HttpGet("chef-documents/{targetUserId:guid}")]
    public async Task<IActionResult> GetChefDocumentUrl(
        Guid targetUserId,
        [FromQuery] ChefDocumentType documentType,
        CancellationToken ct) =>
        (await getChiefDocumentUrlHandler.Handle(
            new GetChefDocumentUrlQuery(targetUserId, documentType), ct))
            .ToActionResult();

    // ── Delivery Man Applications ────────────────────────────────────────────

    [HttpGet("delivery-man-applications")]
    public async Task<IActionResult> GetDeliveryManApplications(
        [FromQuery] ProfileStatus? status,
        CancellationToken ct) =>
        (await getDeliveryManApplicationsHandler.Handle(
            new GetDeliveryManApplicationsQuery(status), ct))
            .ToActionResult();

    [HttpPut("delivery-man-applications/{targetUserId:guid}/approve")]
    public async Task<IActionResult> ApproveDeliveryMan(
        Guid targetUserId,
        CancellationToken ct) =>
        (await approveDeliveryManHandler.Handle(
            new ApproveDeliveryManProfileCommand(targetUserId), ct))
            .ToActionResult();

    [HttpPut("delivery-man-applications/{targetUserId:guid}/reject")]
    public async Task<IActionResult> RejectDeliveryMan(
        Guid targetUserId,
        [FromBody] string reason,
        CancellationToken ct) =>
        (await rejectDeliveryManHandler.Handle(
            new RejectDeliveryManProfileCommand(targetUserId, reason), ct))
            .ToActionResult();
}
