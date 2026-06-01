using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Application.Abstractions.Authentication;
using Domain.Users;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Infrastructure.Authentication;

/// <summary>
/// Generates a JWT and writes it to an HttpOnly, Secure, SameSite=Strict cookie.
/// The token is never returned in the response body — only in the cookie —
/// so JavaScript cannot read it, protecting against XSS.
/// </summary>
internal sealed class TokenProvider(
    IOptions<JwtSettings> settings,
    IHttpContextAccessor httpContextAccessor) : ITokenProvider
{
    private readonly JwtSettings _settings = settings.Value;

    public string Create(User user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.GivenName, user.FirstName),
            new(JwtRegisteredClaimNames.FamilyName, user.LastName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),

            // Role claims — used for policy-based auth in the API layer
            new(ClaimTypes.Role, "Customer"), // everyone can order
        };

        if (user.IsApprovedChef)
            claims.Add(new Claim(ClaimTypes.Role, "Chef"));

        if (user.IsApprovedDeliveryMan)
            claims.Add(new Claim(ClaimTypes.Role, "DeliveryMan"));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(_settings.ExpiryMinutes),
            Issuer = _settings.Issuer,
            Audience = _settings.Audience,
            SigningCredentials = credentials
        };

        var handler = new JwtSecurityTokenHandler();
        string token = handler.WriteToken(handler.CreateToken(tokenDescriptor));

        // Write to HttpOnly cookie — JavaScript cannot access this
        httpContextAccessor.HttpContext?.Response.Cookies.Append(
            _settings.CookieName,
            token,
            new CookieOptions
            {
                HttpOnly = true,          // not accessible via document.cookie
                Secure = true,            // only sent over HTTPS
                SameSite = SameSiteMode.Strict, // no cross-site requests
                Expires = DateTimeOffset.UtcNow.AddMinutes(_settings.ExpiryMinutes),
                Path = "/"
            });

        // Return the token string so RegisterCommandHandler / LoginCommandHandler
        // can include it in the response body for non-browser clients (mobile apps, etc.)
        // Browser clients should read from the cookie; API clients from the body.
        return token;
    }
}
