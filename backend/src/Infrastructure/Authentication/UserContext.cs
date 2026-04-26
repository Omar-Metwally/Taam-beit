using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Application.Abstractions.Authentication;
using Microsoft.AspNetCore.Http;

namespace Infrastructure.Authentication;

/// <summary>
/// Reads the current authenticated user's ID from the JWT claims
/// populated by the JwtBearer middleware from the HttpOnly cookie.
/// </summary>
internal sealed class UserContext(IHttpContextAccessor httpContextAccessor) : IUserContext
{
    public Guid UserId
    {
        get
        {
            string? sub = httpContextAccessor.HttpContext?
                .User
                .FindFirstValue(JwtRegisteredClaimNames.Sub);

            if (sub is null || !Guid.TryParse(sub, out Guid userId))
                throw new InvalidOperationException(
                    "UserId claim is missing. Ensure the endpoint requires authentication.");

            return userId;
        }
    }
}
