using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.SetDefaultMealVariant;

public sealed record SetDefaultMealVariantCommand(Guid MealId, Guid VariantId) : ICommand;

internal sealed class SetDefaultMealVariantCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<SetDefaultMealVariantCommand>
{
    public async Task<Result> Handle(
        SetDefaultMealVariantCommand command,
        CancellationToken cancellationToken)
    {
        Meal? meal = await dbContext.Meals
            .FirstOrDefaultAsync(m => m.Id == command.MealId, cancellationToken);

        if (meal is null)
            return Result.Failure(MealErrors.NotFound(command.MealId));

        if (meal.ChefId != userContext.UserId)
            return Result.Failure(UserErrors.Unauthorized);

        Result result = meal.SetDefaultVariant(command.VariantId);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

internal sealed class SetDefaultMealVariantCommandValidator
    : AbstractValidator<SetDefaultMealVariantCommand>
{
    public SetDefaultMealVariantCommandValidator()
    {
        RuleFor(x => x.MealId).NotEmpty();
        RuleFor(x => x.VariantId).NotEmpty();
    }
}