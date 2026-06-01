using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Orders;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Orders.ConfirmOrderCommans;

public sealed record ConfirmOrderCommand(Guid OrderId) : ICommand;

internal sealed class ConfirmOrderCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<ConfirmOrderCommand>
{
    public async Task<Result> Handle(ConfirmOrderCommand command, CancellationToken cancellationToken)
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
