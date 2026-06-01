using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Orders;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Orders.MarkOrderReadyForPickup;

public sealed record MarkOrderReadyForPickupCommand(Guid OrderId) : ICommand;

internal sealed class MarkOrderReadyForPickupCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<MarkOrderReadyForPickupCommand>
{
    public async Task<Result> Handle(MarkOrderReadyForPickupCommand command, CancellationToken cancellationToken)
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
