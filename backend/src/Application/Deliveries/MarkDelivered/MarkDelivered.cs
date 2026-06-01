using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;
using Domain.Users;
using Domain.Deliveries;

// ── MarkDelivered ─────────────────────────────────────────────────────────────
// Delivery man confirms successful handoff to the customer.
// Order.MarkDelivered + customer notification handled by DeliveryCompletedDomainEventHandler.

namespace Application.Deliveries.MarkDelivered;

public sealed record MarkDeliveredCommand(Guid DeliveryTrackingId) : ICommand;

internal sealed class MarkDeliveredCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<MarkDeliveredCommand>
{
    public async Task<Result> Handle(MarkDeliveredCommand command, CancellationToken cancellationToken)
    {
        DeliveryTracking? tracking = await dbContext.DeliveryTrackings
            .FirstOrDefaultAsync(d => d.Id == command.DeliveryTrackingId, cancellationToken);

        if (tracking is null)
            return Result.Failure(DeliveryErrors.NotFound(command.DeliveryTrackingId));

        if (tracking.DeliveryManId != userContext.UserId)
            return Result.Failure(UserErrors.Unauthorized);

        Result result = tracking.MarkDelivered(dateTimeProvider.UtcNow);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        // DeliveryCompletedDomainEvent → outbox → DeliveryCompletedDomainEventHandler
        // That handler: (1) calls Order.MarkDelivered, (2) customer notification via
        //               the resulting OrderDeliveredDomainEvent.
        return Result.Success();
    }
}

internal sealed class MarkDeliveredCommandValidator : AbstractValidator<MarkDeliveredCommand>
{
    public MarkDeliveredCommandValidator() => RuleFor(x => x.DeliveryTrackingId).NotEmpty();
}
