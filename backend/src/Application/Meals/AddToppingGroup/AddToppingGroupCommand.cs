using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.AddToppingGroup;

public sealed record AddToppingGroupCommand(
    Guid MealId,
    string Name,
    int MinSelections,
    int MaxSelections) : ICommand<Guid>;

internal sealed class AddToppingGroupCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<AddToppingGroupCommand, Guid>
{
    public async Task<Result<Guid>> Handle(
        AddToppingGroupCommand command,
        CancellationToken cancellationToken)
    {
        Meal? meal = await dbContext.Meals
            .FirstOrDefaultAsync(m => m.Id == command.MealId, cancellationToken);

        if (meal is null)
            return Result.Failure<Guid>(MealErrors.NotFound(command.MealId));

        if (meal.ChefId != userContext.UserId)
            return Result.Failure<Guid>(UserErrors.Unauthorized);

        Result<ToppingGroup> result = meal.AddToppingGroup(
            command.Name,
            command.MinSelections,
            command.MaxSelections);

        if (result.IsFailure)
            return Result.Failure<Guid>(result.Error);

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(result.Value.Id);
    }
}

internal sealed class AddToppingGroupCommandValidator : AbstractValidator<AddToppingGroupCommand>
{
    public AddToppingGroupCommandValidator()
    {
        RuleFor(x => x.MealId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.MinSelections).GreaterThanOrEqualTo(0);
        RuleFor(x => x.MaxSelections).GreaterThanOrEqualTo(1);
        RuleFor(x => x.MaxSelections).GreaterThanOrEqualTo(x => x.MinSelections)
            .WithMessage("MaxSelections must be greater than or equal to MinSelections.");
    }
}
