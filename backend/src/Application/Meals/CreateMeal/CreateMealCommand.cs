using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.CreateMeal;

/// <summary>
/// Creates a meal draft with no variants. Variants, extras and photos are added
/// in subsequent steps via dedicated commands.
/// </summary>
public sealed record CreateMealCommand(
    string Name,
    string? Description,
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
            .Include(u => u.ChefProfile)
            .FirstOrDefaultAsync(u => u.Id == userContext.UserId, cancellationToken);

        if (user is null)
            return Result.Failure<Guid>(UserErrors.NotFound(userContext.UserId));

        if (!user.IsApprovedChef)
            return Result.Failure<Guid>(UserErrors.ChefProfileNotActive);

        var meal = Meal.Create(
            chefId: userContext.UserId,
            name: command.Name,
            description: command.Description,
            dishType: command.DishType,
            cuisineType: command.CuisineType,
            createdAt: dateTimeProvider.UtcNow);

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
        RuleFor(x => x.DishType).IsInEnum();
        RuleFor(x => x.CuisineType).MaximumLength(100).When(x => x.CuisineType is not null);
    }
}
