using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Common;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

// ── AddMealVariant ────────────────────────────────────────────────────────────

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

// ── UpdateMealVariant ─────────────────────────────────────────────────────────

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
    public async Task<r> Handle(
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

// ── RemoveMealVariant ─────────────────────────────────────────────────────────

namespace Application.Meals.RemoveMealVariant;

public sealed record RemoveMealVariantCommand(Guid MealId, Guid VariantId) : ICommand;

internal sealed class RemoveMealVariantCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<RemoveMealVariantCommand>
{
    public async Task<r> Handle(
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

// ── SetDefaultMealVariant ─────────────────────────────────────────────────────

namespace Application.Meals.SetDefaultMealVariant;

public sealed record SetDefaultMealVariantCommand(Guid MealId, Guid VariantId) : ICommand;

internal sealed class SetDefaultMealVariantCommandHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : ICommandHandler<SetDefaultMealVariantCommand>
{
    public async Task<r> Handle(
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
