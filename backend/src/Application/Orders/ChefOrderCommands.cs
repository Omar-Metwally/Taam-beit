using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Orders;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

// ── Confirm ───────────────────────────────────────────────────────────────────

namespace Application.Orders.ConfirmOrder;

public sealed record ConfirmOrderCommand(Guid OrderId) : ICommand;

internal sealed class ConfirmOrderCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<ConfirmOrderCommand>
{
    public async Task<r> Handle(ConfirmOrderCommand command, CancellationToken cancellationToken)
    {
        Order? order = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == command.OrderId, cancellationToken);

        if (order is null)
            return Result.Failure(OrderErrors.NotFound(command.OrderId));

        if (order.ChefId != userContext.UserId)
            return Result.Failure(UserErrors.Unauthorized);

        Result result = order.Confirm(dateTimeProvider.UtcNow);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        // OrderConfirmedDomainEvent is now in the outbox.
        // OrderConfirmedDomainEventHandler sends the customer notification.
        return Result.Success();
    }
}

internal sealed class ConfirmOrderCommandValidator : AbstractValidator<ConfirmOrderCommand>
{
    public ConfirmOrderCommandValidator() => RuleFor(x => x.OrderId).NotEmpty();
}

// ── Reject ────────────────────────────────────────────────────────────────────

namespace Application.Orders.RejectOrder;

public sealed record RejectOrderCommand(Guid OrderId, string Reason) : ICommand;

internal sealed class RejectOrderCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<RejectOrderCommand>
{
    public async Task<r> Handle(RejectOrderCommand command, CancellationToken cancellationToken)
    {
        Order? order = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == command.OrderId, cancellationToken);

        if (order is null)
            return Result.Failure(OrderErrors.NotFound(command.OrderId));

        if (order.ChefId != userContext.UserId)
            return Result.Failure(UserErrors.Unauthorized);

        Result result = order.Reject(command.Reason);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        // OrderRejectedDomainEvent → outbox → OrderRejectedDomainEventHandler
        return Result.Success();
    }
}

internal sealed class RejectOrderCommandValidator : AbstractValidator<RejectOrderCommand>
{
    public RejectOrderCommandValidator()
    {
        RuleFor(x => x.OrderId).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}

// ── StartPreparing ────────────────────────────────────────────────────────────

namespace Application.Orders.StartPreparingOrder;

public sealed record StartPreparingOrderCommand(Guid OrderId) : ICommand;

internal sealed class StartPreparingOrderCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<StartPreparingOrderCommand>
{
    public async Task<r> Handle(StartPreparingOrderCommand command, CancellationToken cancellationToken)
    {
        Order? order = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == command.OrderId, cancellationToken);

        if (order is null)
            return Result.Failure(OrderErrors.NotFound(command.OrderId));

        if (order.ChefId != userContext.UserId)
            return Result.Failure(UserErrors.Unauthorized);

        Result result = order.StartPreparing();
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        // OrderPreparingDomainEvent → outbox → OrderPreparingDomainEventHandler
        return Result.Success();
    }
}

internal sealed class StartPreparingOrderCommandValidator : AbstractValidator<StartPreparingOrderCommand>
{
    public StartPreparingOrderCommandValidator() => RuleFor(x => x.OrderId).NotEmpty();
}

// ── MarkReadyForPickup ────────────────────────────────────────────────────────

namespace Application.Orders.MarkOrderReadyForPickup;

public sealed record MarkOrderReadyForPickupCommand(Guid OrderId) : ICommand;

internal sealed class MarkOrderReadyForPickupCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<MarkOrderReadyForPickupCommand>
{
    public async Task<r> Handle(MarkOrderReadyForPickupCommand command, CancellationToken cancellationToken)
    {
        Order? order = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == command.OrderId, cancellationToken);

        if (order is null)
            return Result.Failure(OrderErrors.NotFound(command.OrderId));

        if (order.ChefId != userContext.UserId)
            return Result.Failure(UserErrors.Unauthorized);

        Result result = order.MarkReadyForPickup(dateTimeProvider.UtcNow);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        // OrderReadyForPickupDomainEvent → outbox → OrderReadyForPickupDomainEventHandler
        // That handler: (1) notifies customer, (2) H3 fan-out to nearby delivery men
        return Result.Success();
    }
}

internal sealed class MarkOrderReadyForPickupCommandValidator : AbstractValidator<MarkOrderReadyForPickupCommand>
{
    public MarkOrderReadyForPickupCommandValidator() => RuleFor(x => x.OrderId).NotEmpty();
}
