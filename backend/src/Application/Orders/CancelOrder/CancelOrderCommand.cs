using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Orders;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Orders.CancelOrder;

public sealed record CancelOrderCommand(Guid OrderId, string? Reason) : ICommand;

internal sealed class CancelOrderCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<CancelOrderCommand>
{
    public async Task<r> Handle(CancelOrderCommand command, CancellationToken cancellationToken)
    {
        Order? order = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == command.OrderId, cancellationToken);

        if (order is null)
            return Result.Failure(OrderErrors.NotFound(command.OrderId));

        if (order.CustomerId != userContext.UserId)
            return Result.Failure(UserErrors.Unauthorized);

        Result result = order.Cancel(command.Reason);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        // OrderCancelledDomainEvent → outbox → OrderCancelledDomainEventHandler
        // That handler notifies the chef.
        return Result.Success();
    }
}

internal sealed class CancelOrderCommandValidator : AbstractValidator<CancelOrderCommand>
{
    public CancelOrderCommandValidator()
    {
        RuleFor(x => x.OrderId).NotEmpty();
        RuleFor(x => x.Reason).MaximumLength(500).When(x => x.Reason is not null);
    }
}
