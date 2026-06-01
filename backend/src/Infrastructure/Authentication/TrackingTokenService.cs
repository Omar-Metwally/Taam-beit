using System.Security.Cryptography;
using System.Text;
using Application.Abstractions.Authentication;
using Microsoft.Extensions.Options;

namespace Infrastructure.Authentication;

/// <summary>
/// HMAC-SHA256 implementation of <see cref="ITrackingTokenService"/>.
///
/// Token format (Base64Url):
///   {userId}:{orderId}:{expiryUnixSeconds}:{hmac}
///
/// The HMAC covers the first three fields so the expiry cannot be extended
/// and the IDs cannot be swapped without invalidating the signature.
/// Re-uses the existing <see cref="JwtSettings.SecretKey"/> — no new config needed.
/// </summary>
internal sealed class TrackingTokenService(IOptions<JwtSettings> settings)
    : ITrackingTokenService
{
    private readonly byte[] _key = Encoding.UTF8.GetBytes(settings.Value.SecretKey);

    public string CreateToken(Guid userId, Guid orderId)
    {
        long expiry = DateTimeOffset.UtcNow
            .Add(ITrackingTokenService.TokenTtl)
            .ToUnixTimeSeconds();

        string payload = BuildPayload(userId, orderId, expiry);
        string hmac    = ComputeHmac(payload);

        return Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{payload}:{hmac}"));
    }

    public bool ValidateToken(string token, out Guid userId, out Guid orderId)
    {
        userId  = Guid.Empty;
        orderId = Guid.Empty;

        try
        {
            string decoded = Encoding.UTF8.GetString(Convert.FromBase64String(token));
            string[] parts = decoded.Split(':');

            if (parts.Length != 4) return false;

            if (!Guid.TryParse(parts[0], out userId))  return false;
            if (!Guid.TryParse(parts[1], out orderId)) return false;
            if (!long.TryParse(parts[2], out long expiry)) return false;

            // Reject expired tokens
            if (DateTimeOffset.FromUnixTimeSeconds(expiry) < DateTimeOffset.UtcNow)
                return false;

            // Constant-time HMAC comparison to prevent timing attacks
            string expectedHmac = ComputeHmac(BuildPayload(userId, orderId, expiry));
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(parts[3]),
                Encoding.UTF8.GetBytes(expectedHmac));
        }
        catch
        {
            return false;
        }
    }

    private static string BuildPayload(Guid userId, Guid orderId, long expiry)
        => $"{userId}:{orderId}:{expiry}";

    private string ComputeHmac(string data)
    {
        byte[] hash = HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
