using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Common;
using Domain.Meals;
using Domain.Orders;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Orders.PlaceOrder;

public sealed record PlaceOrderCommand(
    Guid ChefId,
    double DeliveryLatitude,
    double DeliveryLongitude,
    string? DeliveryAddressLine,
    PaymentMethod PaymentMethod,
    List<OrderItemRequest> Items) : ICommand<Guid>;

internal sealed class PlaceOrderCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<PlaceOrderCommand, Guid>
{
    public async Task<Result<Guid>> Handle(
        PlaceOrderCommand command,
        CancellationToken cancellationToken)
    {
        User? chef = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == command.ChefId, cancellationToken);

        if (chef is null || !chef.IsApprovedChef)
            return Result.Failure<Guid>(UserErrors.ChefProfileNotActive);

        Result<Location> locationResult = Location.Create(
            command.DeliveryLatitude,
            command.DeliveryLongitude,
            command.DeliveryAddressLine);

        if (locationResult.IsFailure)
            return Result.Failure<Guid>(locationResult.Error);

        var mealIds = command.Items.Select(i => i.MealId).ToList();

        Dictionary<Guid, Meal> mealsById = await dbContext.Meals
            .Where(m => mealIds.Contains(m.Id))
            .Include(m => m.Variants)
            .Include(m => m.SideDishes)
            .Include(m => m.ToppingGroups)
                .ThenInclude(g => g.Options)
            .ToDictionaryAsync(m => m.Id, cancellationToken);

        Result<Order> orderResult = Order.Create(
            userContext.UserId,
            command.ChefId,
            locationResult.Value,
            command.PaymentMethod,
            command.Items,
            mealsById,
            dateTimeProvider.UtcNow);

        if (orderResult.IsFailure)
            return Result.Failure<Guid>(orderResult.Error);

        dbContext.Orders.Add(orderResult.Value);
        await dbContext.SaveChangesAsync(cancellationToken);
        // OrderPlacedDomainEvent → outbox → OrderPlacedDomainEventHandler
        // That handler notifies the chef of the new order.
        return Result.Success(orderResult.Value.Id);
    }
}

internal sealed class PlaceOrderCommandValidator : AbstractValidator<PlaceOrderCommand>
{
    public PlaceOrderCommandValidator()
    {
        RuleFor(x => x.ChefId).NotEmpty();
        RuleFor(x => x.DeliveryLatitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.DeliveryLongitude).InclusiveBetween(-180, 180);
        RuleFor(x => x.PaymentMethod).IsInEnum();
        RuleFor(x => x.Items).NotEmpty();
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.MealId).NotEmpty();
            item.RuleFor(i => i.MealVariantId).NotEmpty();
            item.RuleFor(i => i.Quantity).GreaterThan(0);
        });
    }
}
