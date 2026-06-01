using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Orders;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Orders.StartPreparingOrder;

public sealed record StartPreparingOrderCommand(Guid OrderId) : ICommand;

internal sealed class StartPreparingOrderCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<StartPreparingOrderCommand>
{
    public async Task<Result> Handle(StartPreparingOrderCommand command, CancellationToken cancellationToken)
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
