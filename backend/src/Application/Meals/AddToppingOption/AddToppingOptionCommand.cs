using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Common;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.AddToppingOption;

public sealed record AddToppingOptionCommand(
    Guid MealId,
    Guid ToppingGroupId,
    string Name,
    decimal ExtraPrice,
    string Currency) : ICommand;

internal sealed class AddToppingOptionCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<AddToppingOptionCommand>
{
    public async Task<Result> Handle(
        AddToppingOptionCommand command,
        CancellationToken cancellationToken)
    {
        Meal? meal = await dbContext.Meals
            .FirstOrDefaultAsync(m => m.Id == command.MealId, cancellationToken);

        if (meal is null)
            return Result.Failure<Guid>(MealErrors.NotFound(command.MealId));

        if (meal.ChefId != userContext.UserId)
            return Result.Failure<Guid>(UserErrors.Unauthorized);

        Result<Money> moneyResult = Money.Create(command.ExtraPrice, command.Currency);
        if (moneyResult.IsFailure)
            return Result.Failure<Guid>(moneyResult.Error);

        Result result = meal.AddToppingOption(
            command.ToppingGroupId,
            command.Name,
            moneyResult.Value);

        if (result.IsFailure)
            return Result.Failure<Guid>(result.Error);

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

internal sealed class AddToppingOptionCommandValidator : AbstractValidator<AddToppingOptionCommand>
{
    public AddToppingOptionCommandValidator()
    {
        RuleFor(x => x.MealId).NotEmpty();
        RuleFor(x => x.ToppingGroupId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ExtraPrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Currency).NotEmpty().Length(3);
    }
}
