using Api.Extensions;
using Application.Abstractions.Messaging;
using Application.Users.Login;
using Application.Users.RefreshAuth;
using Application.Users.Register;
using Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Api.Controllers;

/// <summary>
/// Authentication endpoints — registration, login, logout.
/// No authorization required.
/// </summary>
[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    ICommandHandler<RegisterCommand, LoginResponse> registerHandler,
    ICommandHandler<LoginCommand, LoginResponse> loginHandler,
    IQueryHandler<RefreshAuthQuery, LoginResponse> refreshHandler,
    IOptions<JwtSettings> jwtSettings) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterCommand command,
        CancellationToken ct)
    {
        var result = await registerHandler.Handle(command, ct);
        return result.IsSuccess
            ? Ok(new { result.Value.UserId })
            : result.ToActionResult();
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginCommand command,
        CancellationToken ct)
    {
        var result = await loginHandler.Handle(command, ct);
        return result.IsSuccess
            ? Ok(new { result.Value.UserId, result.Value.Roles })
            : result.ToActionResult();
    }

    [HttpGet("refresh")]
    [Authorize]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        var result = await refreshHandler.Handle(new RefreshAuthQuery(), ct);
        return result.IsSuccess
            ? Ok(new { result.Value.UserId, result.Value.Roles })
            : result.ToActionResult();
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(jwtSettings.Value.CookieName);
        return NoContent();
    }
}
