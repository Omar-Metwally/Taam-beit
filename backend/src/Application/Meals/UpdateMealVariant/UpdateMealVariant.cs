using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Common;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.UpdateMealVariant;

public sealed record UpdateMealVariantCommand(
    Guid MealId,
    Guid VariantId,
    string Name,
    decimal Price,
    string Currency) : ICommand;

internal sealed class UpdateMealVariantCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<UpdateMealVariantCommand>
{
    public async Task<Result> Handle(
        UpdateMealVariantCommand command,
        CancellationToken cancellationToken)
    {
        Meal? meal = await dbContext.Meals
            .FirstOrDefaultAsync(m => m.Id == command.MealId, cancellationToken);

        if (meal is null)
            return Result.Failure(MealErrors.NotFound(command.MealId));

        if (meal.ChefId != userContext.UserId)
            return Result.Failure(UserErrors.Unauthorized);

        Result<Money> moneyResult = Money.Create(command.Price, command.Currency);
        if (moneyResult.IsFailure)
            return Result.Failure(moneyResult.Error);

        Result result = meal.UpdateVariant(command.VariantId, command.Name, moneyResult.Value);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

internal sealed class UpdateMealVariantCommandValidator : AbstractValidator<UpdateMealVariantCommand>
{
    public UpdateMealVariantCommandValidator()
    {
        RuleFor(x => x.MealId).NotEmpty();
        RuleFor(x => x.VariantId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Price).GreaterThan(0);
        RuleFor(x => x.Currency).NotEmpty().Length(3);
    }
}
