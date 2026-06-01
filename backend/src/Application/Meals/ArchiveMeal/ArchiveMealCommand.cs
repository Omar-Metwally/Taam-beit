using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Meals;
using Domain.Orders;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.ArchiveMeal;

public sealed record ArchiveMealCommand(Guid MealId) : ICommand;

internal sealed class ArchiveMealCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<ArchiveMealCommand>
{
    public async Task<Result> Handle(
        ArchiveMealCommand command,
        CancellationToken cancellationToken)
    {
        Meal? meal = await dbContext.Meals
            .FirstOrDefaultAsync(m => m.Id == command.MealId, cancellationToken);

        if (meal is null)
            return Result.Failure(MealErrors.NotFound(command.MealId));

        if (meal.ChefId != userContext.UserId)
            return Result.Failure(UserErrors.Unauthorized);

        // Block archiving if any order referencing this meal is still active.
        // "Active" means any non-terminal status — not yet Delivered or Cancelled.
        bool hasActiveOrders = await dbContext.Orders
            .AnyAsync(
                o => o.Items.Any(oi => oi.MealId == command.MealId) &&
                     o.Status != OrderStatus.Delivered &&
                     o.Status != OrderStatus.Cancelled,
                cancellationToken);

        if (hasActiveOrders)
            return Result.Failure(MealErrors.CannotArchiveWithActiveOrders);

        Result result = meal.Archive(dateTimeProvider.UtcNow);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

internal sealed class ArchiveMealCommandValidator : AbstractValidator<ArchiveMealCommand>
{
    public ArchiveMealCommandValidator()
    {
        RuleFor(x => x.MealId).NotEmpty();
    }
}
