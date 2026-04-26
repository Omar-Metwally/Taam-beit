using Api.Extensions;
using Application.Abstractions.Messaging;
using Application.Users.ApplyAsChef;
using Application.Users.ApplyAsDeliveryMan;
using Application.Users.ApproveChefProfile;
using Application.Users.ApproveDeliveryManProfile;
using Application.Users.Login;
using Application.Users.Register;
using Application.Users.RejectChefProfile;
using Application.Users.RejectDeliveryManProfile;
using Application.Users.UpdateDeliveryManLocation;
using Application.Users.GetChefDocumentUrl;
using Application.Users.UploadChefAvatar;
using Application.Users.UploadChefDocument;
using Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController(
    ICommandHandler<RegisterCommand, RegisterResponse> registerHandler,
    ICommandHandler<LoginCommand, LoginResponse> loginHandler,
    ICommandHandler<ApplyAsChefCommand> applyAsChefHandler,
    ICommandHandler<ApplyAsDeliveryManCommand> applyAsDeliveryManHandler,
    ICommandHandler<ApproveChefProfileCommand> approveChefHandler,
    ICommandHandler<RejectChefProfileCommand> rejectChefHandler,
    ICommandHandler<ApproveDeliveryManProfileCommand> approveDeliveryManHandler,
    ICommandHandler<RejectDeliveryManProfileCommand> rejectDeliveryManHandler,
    ICommandHandler<UpdateDeliveryManLocationCommand> updateLocationHandler,
    ICommandHandler<UploadChefAvatarCommand, string> uploadAvatarHandler,
    IOptions<JwtSettings> jwtSettings) : ControllerBase
{
    // ── Auth ──────────────────────────────────────────────────────────────────

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register(
        [FromBody] RegisterCommand command,
        CancellationToken ct)
    {
        var result = await registerHandler.Handle(command, ct);
        // Cookie is set by TokenProvider; body contains userId only
        return result.IsSuccess
            ? Ok(new { result.Value.UserId })
            : result.ToActionResult();
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(
        [FromBody] LoginCommand command,
        CancellationToken ct)
    {
        var result = await loginHandler.Handle(command, ct);
        return result.IsSuccess
            ? Ok(new { result.Value.UserId })
            : result.ToActionResult();
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(jwtSettings.Value.CookieName);
        return NoContent();
    }

    // ── Chef role ─────────────────────────────────────────────────────────────

    [HttpPost("me/chef-profile")]
    [Authorize]
    public async Task<IActionResult> ApplyAsChef(
        [FromBody] ApplyAsChefCommand command,
        CancellationToken ct) =>
        (await applyAsChefHandler.Handle(command, ct)).ToActionResult();

    [HttpPut("chef-profiles/{targetUserId:guid}/approve")]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> ApproveChef(
        Guid targetUserId,
        CancellationToken ct) =>
        (await approveChefHandler.Handle(new ApproveChefProfileCommand(targetUserId), ct))
            .ToActionResult();

    [HttpPut("chef-profiles/{targetUserId:guid}/reject")]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> RejectChef(
        Guid targetUserId,
        [FromBody] string reason,
        CancellationToken ct) =>
        (await rejectChefHandler.Handle(new RejectChefProfileCommand(targetUserId, reason), ct))
            .ToActionResult();

    // ── Delivery man role ─────────────────────────────────────────────────────

    [HttpPost("me/delivery-man-profile")]
    [Authorize]
    public async Task<IActionResult> ApplyAsDeliveryMan(
        [FromBody] ApplyAsDeliveryManCommand command,
        CancellationToken ct) =>
        (await applyAsDeliveryManHandler.Handle(command, ct)).ToActionResult();

    [HttpPut("delivery-man-profiles/{targetUserId:guid}/approve")]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> ApproveDeliveryMan(
        Guid targetUserId,
        CancellationToken ct) =>
        (await approveDeliveryManHandler.Handle(
            new ApproveDeliveryManProfileCommand(targetUserId), ct))
            .ToActionResult();

    [HttpPut("delivery-man-profiles/{targetUserId:guid}/reject")]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> RejectDeliveryMan(
        Guid targetUserId,
        [FromBody] string reason,
        CancellationToken ct) =>
        (await rejectDeliveryManHandler.Handle(
            new RejectDeliveryManProfileCommand(targetUserId, reason), ct))
            .ToActionResult();

    // ── Chef avatar ───────────────────────────────────────────────────────────

    [HttpPost("me/chef-avatar")]
    [Authorize(Roles = "Chef")]
    [RequestSizeLimit(2 * 1024 * 1024)] // 2 MB
    public async Task<IActionResult> UploadChefAvatar(
        IFormFile avatar,
        CancellationToken ct)
    {
        var result = await uploadAvatarHandler.Handle(
            new UploadChefAvatarCommand(
                avatar.FileName,
                avatar.ContentType,
                avatar.OpenReadStream()), ct);

        return result.IsSuccess
            ? Ok(new { avatarUrl = result.Value })
            : result.ToActionResult();
    }

    // ── Chef documents (private — presigned URLs) ────────────────────────────────

    [HttpPost("me/chef-documents")]
    [Authorize(Roles = "Chef")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB
    public async Task<IActionResult> UploadChefDocument(
        [FromQuery] ChefDocumentType documentType,
        IFormFile document,
        CancellationToken ct)
    {
        var result = await uploadDocumentHandler.Handle(
            new UploadChefDocumentCommand(
                documentType,
                document.FileName,
                document.ContentType,
                document.OpenReadStream()), ct);

        return result.IsSuccess
            ? Ok(new { objectKey = result.Value })
            : result.ToActionResult();
    }

    [HttpGet("chef-documents/{targetUserId:guid}")]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> GetChefDocumentUrl(
        Guid targetUserId,
        [FromQuery] ChefDocumentType documentType,
        CancellationToken ct) =>
        (await getDocumentUrlHandler.Handle(
            new GetChefDocumentUrlQuery(targetUserId, documentType), ct))
            .ToActionResult();

    // ── GPS (lightweight — no EF, direct cache write) ─────────────────────────

    [HttpPost("me/location")]
    [Authorize(Roles = "DeliveryMan")]
    public async Task<IActionResult> UpdateLocation(
        [FromBody] UpdateDeliveryManLocationCommand command,
        CancellationToken ct) =>
        (await updateLocationHandler.Handle(command, ct)).ToActionResult();
}
