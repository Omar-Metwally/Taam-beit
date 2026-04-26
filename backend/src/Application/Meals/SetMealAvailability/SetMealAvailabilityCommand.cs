using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.SetMealAvailability;

public sealed record SetMealAvailabilityCommand(Guid MealId, bool IsAvailable) : ICommand;

internal sealed class SetMealAvailabilityCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<SetMealAvailabilityCommand>
{
    public async Task<r> Handle(
        SetMealAvailabilityCommand command,
        CancellationToken cancellationToken)
    {
        Meal? meal = await dbContext.Meals
            .FirstOrDefaultAsync(m => m.Id == command.MealId, cancellationToken);

        if (meal is null)
            return Result.Failure(MealErrors.NotFound(command.MealId));

        if (meal.ChefId != userContext.UserId)
            return Result.Failure(UserErrors.Unauthorized);

        meal.SetAvailability(command.IsAvailable);

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

internal sealed class SetMealAvailabilityCommandValidator : AbstractValidator<SetMealAvailabilityCommand>
{
    public SetMealAvailabilityCommandValidator()
    {
        RuleFor(x => x.MealId).NotEmpty();
    }
}
