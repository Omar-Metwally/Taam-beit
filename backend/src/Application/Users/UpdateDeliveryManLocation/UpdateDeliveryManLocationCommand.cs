using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Deliveries;
using Domain.Orders;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.UpdateDeliveryManLocation;

/// <summary>
/// Lightweight GPS update — bypasses EF Core and the outbox entirely.
/// Writes directly to cache_driver_positions via IDeliveryPositionCache.
/// The pg_notify trigger on that table handles SignalR fan-out to the customer.
///
/// ActiveOrderId is intentionally NOT accepted from the client. The handler
/// resolves the driver's current active order from DeliveryTracking server-side
/// so a compromised or buggy client cannot route GPS updates to arbitrary orders.
/// </summary>
public sealed record UpdateDeliveryManLocationCommand(
    double Latitude,
    double Longitude,
    double? HeadingDegrees,
    double? SpeedKmh) : ICommand;

internal sealed class UpdateDeliveryManLocationCommandHandler(
    IDeliveryPositionCache positionCache,
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<UpdateDeliveryManLocationCommand>
{
    public async Task<Result> Handle(
        UpdateDeliveryManLocationCommand command,
        CancellationToken cancellationToken)
    {
        // Resolve the active order server-side — never trust the client-supplied value
        DeliveryTracking? activeDelivery = await dbContext.DeliveryTrackings
            .FirstOrDefaultAsync(
                d => d.DeliveryManId == userContext.UserId
                  && d.Status != DeliveryStatus.Delivered,
                cancellationToken);

        await positionCache.UpsertAsync(
            userContext.UserId,
            activeDelivery?.OrderId,   // null when driver is between deliveries
            command.Latitude,
            command.Longitude,
            command.HeadingDegrees,
            command.SpeedKmh,
            cancellationToken);

        return Result.Success();
    }
}

internal sealed class UpdateDeliveryManLocationCommandValidator
    : AbstractValidator<UpdateDeliveryManLocationCommand>
{
    public UpdateDeliveryManLocationCommandValidator()
    {
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
        RuleFor(x => x.HeadingDegrees)
            .InclusiveBetween(0, 360)
            .When(x => x.HeadingDegrees.HasValue);
        RuleFor(x => x.SpeedKmh)
            .GreaterThanOrEqualTo(0)
            .When(x => x.SpeedKmh.HasValue);
    }
}

