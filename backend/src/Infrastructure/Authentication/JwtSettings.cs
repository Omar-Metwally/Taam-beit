namespace Infrastructure.Authentication;

public sealed class JwtSettings
{
    public const string SectionName = "Jwt";

    public string SecretKey { get; init; } = string.Empty;
    public string Issuer { get; init; } = string.Empty;
    public string Audience { get; init; } = string.Empty;

    /// <summary>Token lifetime in minutes.</summary>
    public int ExpiryMinutes { get; init; } = 60;

    /// <summary>Name of the HttpOnly cookie that stores the JWT.</summary>
    public string CookieName { get; init; } = "fd_auth";
}
