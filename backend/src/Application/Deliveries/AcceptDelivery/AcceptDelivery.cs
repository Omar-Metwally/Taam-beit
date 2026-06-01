// ── AcceptDelivery ────────────────────────────────────────────────────────────
// Delivery man accepts a ReadyForPickup order.
// DeliveryTracking creation is handled by OrderAssignedToDeliveryManDomainEventHandler
// via the outbox — this handler only transitions the Order state.

using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;
using Domain.Orders;
using Domain.Users;

namespace Application.Deliveries.AcceptDelivery;

public sealed record AcceptDeliveryCommand(Guid OrderId) : ICommand;

internal sealed class AcceptDeliveryCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<AcceptDeliveryCommand>
{
    public async Task<Result> Handle(
        AcceptDeliveryCommand command,
        CancellationToken cancellationToken)
    {
        User? deliveryMan = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userContext.UserId, cancellationToken);

        if (deliveryMan is null || !deliveryMan.IsApprovedDeliveryMan)
            return Result.Failure(UserErrors.DeliveryManProfileNotActive);

        var isCurrentlyDelivering = await dbContext.Orders
            .AnyAsync(o => o.DeliveryManId == userContext.UserId &&
            o.Status == OrderStatus.OutForDelivery, cancellationToken: cancellationToken);

        if (isCurrentlyDelivering)
            return Result.Failure(UserErrors.DeliveryManCurrentlyDeliveringAnotherOrder);

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

