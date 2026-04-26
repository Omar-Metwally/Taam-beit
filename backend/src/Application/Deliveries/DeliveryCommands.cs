using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Deliveries;
using Domain.Orders;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

// ── AcceptDelivery ────────────────────────────────────────────────────────────
// Delivery man accepts a ReadyForPickup order.
// DeliveryTracking creation is handled by OrderAssignedToDeliveryManDomainEventHandler
// via the outbox — this handler only transitions the Order state.

namespace Application.Deliveries.AcceptDelivery;

public sealed record AcceptDeliveryCommand(Guid OrderId) : ICommand;

internal sealed class AcceptDeliveryCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<AcceptDeliveryCommand>
{
    public async Task<r> Handle(
        AcceptDeliveryCommand command,
        CancellationToken cancellationToken)
    {
        User? deliveryMan = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userContext.UserId, cancellationToken);

        if (deliveryMan is null || !deliveryMan.IsApprovedDeliveryMan)
            return Result.Failure(UserErrors.DeliveryManProfileNotActive);

        Order? order = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == command.OrderId, cancellationToken);

        if (order is null)
            return Result.Failure(OrderErrors.NotFound(command.OrderId));

        Result result = order.AssignDeliveryMan(userContext.UserId);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        // OrderAssignedToDeliveryManDomainEvent → outbox → handler creates DeliveryTracking
        // and notifies the customer that their order is OutForDelivery.
        return Result.Success();
    }
}

internal sealed class AcceptDeliveryCommandValidator : AbstractValidator<AcceptDeliveryCommand>
{
    public AcceptDeliveryCommandValidator() => RuleFor(x => x.OrderId).NotEmpty();
}

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
    public async Task<r> Handle(MarkPickedUpCommand command, CancellationToken cancellationToken)
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
    public async Task<r> Handle(MarkDeliveredCommand command, CancellationToken cancellationToken)
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
