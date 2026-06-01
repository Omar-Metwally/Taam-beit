using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.RemoveMealVariant;

public sealed record RemoveMealVariantCommand(Guid MealId, Guid VariantId) : ICommand;

internal sealed class RemoveMealVariantCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<RemoveMealVariantCommand>
{
    public async Task<Result> Handle(
        RemoveMealVariantCommand command,
        CancellationToken cancellationToken)
    {
        Meal? meal = await dbContext.Meals
            .FirstOrDefaultAsync(m => m.Id == command.MealId, cancellationToken);

        if (meal is null)
            return Result.Failure(MealErrors.NotFound(command.MealId));

        if (meal.ChefId != userContext.UserId)
            return Result.Failure(UserErrors.Unauthorized);

        Result result = meal.RemoveVariant(command.VariantId);
        if (result.IsFailure)
            return result;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

internal sealed class RemoveMealVariantCommandValidator : AbstractValidator<RemoveMealVariantCommand>
{
    public RemoveMealVariantCommandValidator()
    {
        RuleFor(x => x.MealId).NotEmpty();
        RuleFor(x => x.VariantId).NotEmpty();
    }
}