using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Orders;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Orders.GetTrackingToken;

public sealed record GetTrackingTokenQuery(Guid OrderId) : IQuery<TrackingTokenResponse>;

public sealed record TrackingTokenResponse(string Token, int ExpiresInSeconds);

internal sealed class GetTrackingTokenQueryHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    ITrackingTokenService tokenService) : IQueryHandler<GetTrackingTokenQuery, TrackingTokenResponse>
{
    public async Task<Result<TrackingTokenResponse>> Handle(
        GetTrackingTokenQuery query,
        CancellationToken cancellationToken)
    {
        Order? order = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == query.OrderId, cancellationToken);

        if (order is null)
            return Result.Failure<TrackingTokenResponse>(OrderErrors.NotFound(query.OrderId));

        // Only the customer who placed the order may obtain a tracking token
        if (order.CustomerId != userContext.UserId)
            return Result.Failure<TrackingTokenResponse>(UserErrors.Unauthorized);

        // Order must be active — no point tracking a delivered or cancelled order
        if (order.Status is OrderStatus.Delivered or OrderStatus.Cancelled or OrderStatus.Rejected)
            return Result.Failure<TrackingTokenResponse>(OrderErrors.NotTrackable(query.OrderId));

        string token = tokenService.CreateToken(userContext.UserId, query.OrderId);

        return Result.Success(new TrackingTokenResponse(
            Token: token,
            ExpiresInSeconds: (int)ITrackingTokenService.TokenTtl.TotalSeconds));
    }
}

internal sealed class GetTrackingTokenQueryValidator : AbstractValidator<GetTrackingTokenQuery>
{
    public GetTrackingTokenQueryValidator() => RuleFor(x => x.OrderId).NotEmpty();
}
