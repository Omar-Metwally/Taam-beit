using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.RestoreMeal;

public sealed record RestoreMealCommand(Guid MealId) : ICommand;

internal sealed class RestoreMealCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<RestoreMealCommand>
{
    public async Task<Result> Handle(
        RestoreMealCommand command,
        CancellationToken cancellationToken)
    {
        Meal? meal = await dbContext.Meals
            .FirstOrDefaultAsync(m => m.Id == command.MealId, cancellationToken);

        if (meal is null)
            return Result.Failure(MealErrors.NotFound(command.MealId));

        if (meal.ChefId != userContext.UserId)
            return Result.Failure(UserErrors.Unauthorized);

        Result result = meal.Restore();
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

internal sealed class RestoreMealCommandValidator : AbstractValidator<RestoreMealCommand>
{
    public RestoreMealCommandValidator()
    {
        RuleFor(x => x.MealId).NotEmpty();
    }
}
