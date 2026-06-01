using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Common;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.AddMealVariant;

public sealed record AddMealVariantCommand(
    Guid MealId,
    string Name,
    decimal Price,
    string Currency) : ICommand<Guid>;

internal sealed class AddMealVariantCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<AddMealVariantCommand, Guid>
{
    public async Task<Result<Guid>> Handle(
        AddMealVariantCommand command,
        CancellationToken cancellationToken)
    {
        Meal? meal = await dbContext.Meals
            .FirstOrDefaultAsync(m => m.Id == command.MealId, cancellationToken);

        if (meal is null)
            return Result.Failure<Guid>(MealErrors.NotFound(command.MealId));

        if (meal.ChefId != userContext.UserId)
            return Result.Failure<Guid>(UserErrors.Unauthorized);

        Result<Money> moneyResult = Money.Create(command.Price, command.Currency);
        if (moneyResult.IsFailure)
            return Result.Failure<Guid>(moneyResult.Error);

        Result<MealVariant> result = meal.AddVariant(command.Name, moneyResult.Value);
        if (result.IsFailure)
            return Result.Failure<Guid>(result.Error);

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(result.Value.Id);
    }
}

internal sealed class AddMealVariantCommandValidator : AbstractValidator<AddMealVariantCommand>
{
    public AddMealVariantCommandValidator()
    {
        RuleFor(x => x.MealId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Price).GreaterThan(0);
        RuleFor(x => x.Currency).NotEmpty().Length(3);
    }
}