using Api.Extensions;
using Application.Abstractions.Messaging;
using Application.Users.ApplyAsChef;
using Application.Users.ApplyAsDeliveryMan;
using Application.Users.GetMyProfile;
using Application.Users.UpdateChefProfile;
using Application.Users.UpdateCustomerProfile;
using Application.Users.UpdateDeliveryManProfile;
using Application.Users.UploadChefAvatar;
using Application.Users.UploadChefDocument;
using Domain.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

/// <summary>
/// Authenticated user's own profile operations.
/// Apply for roles, upload avatar/documents.
/// </summary>
[ApiController]
[Route("api/me")]
[Authorize]
public sealed class UserProfilesController(
    IQueryHandler<GetMyProfileQuery, MyProfileResponse> getMyProfileHandler,
    ICommandHandler<ApplyAsChefCommand> applyAsChefHandler,
    ICommandHandler<ApplyAsDeliveryManCommand> applyAsDeliveryManHandler,
    ICommandHandler<UpdateCustomerProfileCommand> updateBaseProfile,
    ICommandHandler<UpdateChefProfileCommand> updateChefProfile,
    ICommandHandler<UpdateDeliveryManVehicleTypeCommand> updateDeliveryManProfile,
    ICommandHandler<UploadChefAvatarCommand, ChefAvatarUploadResponse> uploadAvatarHandler,
    ICommandHandler<UploadChefDocumentCommand, string> uploadChiefDocumentHandler)
    : ControllerBase
{
    // ── Profile ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns the authenticated user's full profile including chef and
    /// delivery man sub-profiles when present.
    /// Called by the frontend immediately after login/register to populate
    /// the user store.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetMyProfile(CancellationToken ct) =>
        (await getMyProfileHandler.Handle(new GetMyProfileQuery(), ct)).ToActionResult();

    // ── Role Applications ────────────────────────────────────────────────────

    [HttpPost("chef-profile")]
    public async Task<IActionResult> ApplyAsChef(
        [FromBody] ApplyAsChefCommand command,
        CancellationToken ct) =>
        (await applyAsChefHandler.Handle(command, ct)).ToActionResult();

    [HttpPost("delivery-man-profile")]
    public async Task<IActionResult> ApplyAsDeliveryMan(
        [FromBody] ApplyAsDeliveryManCommand command,
        CancellationToken ct) =>
        (await applyAsDeliveryManHandler.Handle(command, ct)).ToActionResult();

    // ── Update Profiles ────────────────────────────────────────────────────

    [HttpPut]
    public async Task<IActionResult> UpdateBaseUserProfile(
        [FromBody] UpdateCustomerProfileCommand command,
        CancellationToken ct) =>
        (await updateBaseProfile.Handle(command, ct)).ToActionResult();

    [HttpPut("chef-profile")]
    public async Task<IActionResult> UpdateChefProfile(
        [FromBody] UpdateChefProfileCommand command,
        CancellationToken ct) =>
        (await updateChefProfile.Handle(command, ct)).ToActionResult();

    [HttpPut("delivery-man-profile")]
    public async Task<IActionResult> UpdateDeliveryManProfile(
        [FromBody] UpdateDeliveryManVehicleTypeCommand command,
        CancellationToken ct) =>
        (await updateDeliveryManProfile.Handle(command, ct)).ToActionResult();

    // ── Avatar ───────────────────────────────────────────────────────────────

    [HttpPost("chef-avatar")]
    [Authorize(Roles = "Chef")]
    [RequestSizeLimit(2 * 1024 * 1024)]
    public async Task<IActionResult> UploadChefAvatar(
        IFormFile avatar,
        CancellationToken ct)
    {
        var result = await uploadAvatarHandler.Handle(
            new UploadChefAvatarCommand(
                avatar.ContentType,
                avatar.OpenReadStream()), ct);

        return result.IsSuccess
            ? Ok(new { avatarUrl = result.Value })
            : result.ToActionResult();
    }

    // ── Documents ────────────────────────────────────────────────────────────

    [HttpPost("chef-documents")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> UploadChefDocument(
        [FromQuery] ChefDocumentType documentType,
        [FromForm] IFormFile document,
        CancellationToken ct)
    {
        var result = await uploadChiefDocumentHandler.Handle(
            new UploadChefDocumentCommand(
                documentType,
                document.FileName,
                document.ContentType,
                document.OpenReadStream()), ct);

        return result.IsSuccess
            ? Ok(new { objectKey = result.Value })
            : result.ToActionResult();
    }
}
