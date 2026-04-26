using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Common;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.AddSideDish;

public sealed record AddSideDishCommand(
    Guid MealId,
    string Name,
    string? Description,
    decimal Price,
    string Currency,
    bool IsRequired) : ICommand<Guid>;

internal sealed class AddSideDishCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<AddSideDishCommand, Guid>
{
    public async Task<Result<Guid>> Handle(
        AddSideDishCommand command,
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

        meal.AddSideDish(command.Name, command.Description, moneyResult.Value, command.IsRequired);

        await dbContext.SaveChangesAsync(cancellationToken);

        // Return the ID of the newly added side dish
        var sideDish = meal.SideDishes.Last();
        return Result.Success(sideDish.Id);
    }
}

internal sealed class AddSideDishCommandValidator : AbstractValidator<AddSideDishCommand>
{
    public AddSideDishCommandValidator()
    {
        RuleFor(x => x.MealId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(500).When(x => x.Description is not null);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Currency).NotEmpty().Length(3);
    }
}
