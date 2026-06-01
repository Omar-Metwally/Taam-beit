using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;
using Domain.Users;
using Domain.Deliveries;

// ── MarkPickedUp ──────────────────────────────────────────────────────────────
// Delivery man confirms they collected the order from the chef.
// Customer notification handled by DeliveryPickedUpDomainEventHandler.

namespace Application.Deliveries.MarkPickedUp;

public sealed record MarkPickedUpCommand(Guid DeliveryTrackingId) : ICommand;

internal sealed class MarkPickedUpCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<MarkPickedUpCommand>
{
    public async Task<Result> Handle(MarkPickedUpCommand command, CancellationToken cancellationToken)
    {
        DeliveryTracking? tracking = await dbContext.DeliveryTrackings
            .FirstOrDefaultAsync(d => d.Id == command.DeliveryTrackingId, cancellationToken);

        if (tracking is null)
            return Result.Failure(DeliveryErrors.NotFound(command.DeliveryTrackingId));

        if (tracking.DeliveryManId != userContext.UserId)
            return Result.Failure(UserErrors.Unauthorized);

        Result result = tracking.MarkPickedUp(dateTimeProvider.UtcNow);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        // DeliveryPickedUpDomainEvent → outbox → DeliveryPickedUpDomainEventHandler
        return Result.Success();
    }
}

internal sealed class MarkPickedUpCommandValidator : AbstractValidator<MarkPickedUpCommand>
{
    public MarkPickedUpCommandValidator() => RuleFor(x => x.DeliveryTrackingId).NotEmpty();
}
