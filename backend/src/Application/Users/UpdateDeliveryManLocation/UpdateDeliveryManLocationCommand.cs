using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using FluentValidation;
using SharedKernel;

namespace Application.Users.UpdateDeliveryManLocation;

/// <summary>
/// Lightweight GPS update — bypasses EF Core and the outbox entirely.
/// Writes directly to cache_driver_positions via IDeliveryPositionCache.
/// The pg_notify trigger on that table handles SignalR fan-out to the customer.
/// </summary>
public sealed record UpdateDeliveryManLocationCommand(
    double Latitude,
    double Longitude,
    double? HeadingDegrees,
    double? SpeedKmh,
    Guid? ActiveOrderId) : ICommand;

internal sealed class UpdateDeliveryManLocationCommandHandler(
    IDeliveryPositionCache positionCache,
    IUserContext userContext) : ICommandHandler<UpdateDeliveryManLocationCommand>
{
    public async Task<Result> Handle(
        UpdateDeliveryManLocationCommand command,
        CancellationToken cancellationToken)
    {
        await positionCache.UpsertAsync(
            userContext.UserId,
            command.ActiveOrderId,
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
