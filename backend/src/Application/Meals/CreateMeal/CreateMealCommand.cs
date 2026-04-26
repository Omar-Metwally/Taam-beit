using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Common;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.CreateMeal;

public sealed record CreateMealCommand(
    string Name,
    string? Description,
    string DefaultVariantName,
    decimal DefaultVariantPrice,
    string Currency,
    DishType DishType,
    string? CuisineType) : ICommand<Guid>;

internal sealed class CreateMealCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IDateTimeProvider dateTimeProvider) : ICommandHandler<CreateMealCommand, Guid>
{
    public async Task<Result<Guid>> Handle(
        CreateMealCommand command,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userContext.UserId, cancellationToken);

        if (user is null)
            return Result.Failure<Guid>(UserErrors.NotFound(userContext.UserId));

        if (!user.IsApprovedChef)
            return Result.Failure<Guid>(UserErrors.ChefProfileNotActive);

        Result<Money> moneyResult = Money.Create(command.DefaultVariantPrice, command.Currency);
        if (moneyResult.IsFailure)
            return Result.Failure<Guid>(moneyResult.Error);

        var meal = Meal.Create(
            userContext.UserId,
            command.Name,
            command.Description,
            command.DefaultVariantName,
            moneyResult.Value,
            command.DishType,
            command.CuisineType,
            dateTimeProvider.UtcNow);

        dbContext.Meals.Add(meal);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(meal.Id);
    }
}

internal sealed class CreateMealCommandValidator : AbstractValidator<CreateMealCommand>
{
    public CreateMealCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(1000).When(x => x.Description is not null);
        RuleFor(x => x.DefaultVariantName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DefaultVariantPrice).GreaterThan(0);
        RuleFor(x => x.Currency).NotEmpty().Length(3);
        RuleFor(x => x.DishType).IsInEnum();
        RuleFor(x => x.CuisineType).MaximumLength(100).When(x => x.CuisineType is not null);
    }
}
