using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Orders;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Orders.RejectOrder;

public sealed record RejectOrderCommand(Guid OrderId, string Reason) : ICommand;

internal sealed class RejectOrderCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<RejectOrderCommand>
{
    public async Task<Result> Handle(RejectOrderCommand command, CancellationToken cancellationToken)
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
