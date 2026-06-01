namespace Application.Abstractions.Authentication;

/// <summary>
/// Issues and validates short-lived HMAC tokens that authorise a specific
/// customer to subscribe to GPS updates for one of their orders.
///
/// Flow:
///   GET /api/customer/orders/{orderId}/tracking-token
///     → verifies order ownership (CustomerId == caller)
///     → returns a token valid for <see cref="TokenTtl"/>
///
///   Customer passes token to DeliveryHub.TrackOrder(orderId, token)
///     → hub calls ValidateToken — no DB hit, no EF Core in the hot path
///     → only on success does the connection join "order-{orderId}"
/// </summary>
public interface ITrackingTokenService
{
    /// <summary>Lifetime of every issued token.</summary>
    static readonly TimeSpan TokenTtl = TimeSpan.FromMinutes(5);

    /// <summary>
    /// Creates an HMAC-signed token encoding (userId, orderId, expiry).
    /// </summary>
    string CreateToken(Guid userId, Guid orderId);

    /// <summary>
    /// Returns true and the embedded userId/orderId when the token is valid
    /// and unexpired. Returns false on any tamper or expiry.
    /// </summary>
    bool ValidateToken(string token, out Guid userId, out Guid orderId);
}
