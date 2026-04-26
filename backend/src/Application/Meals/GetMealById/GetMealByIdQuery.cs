using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Meals;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.GetMealById;

public sealed record GetMealByIdQuery(Guid MealId) : IQuery<MealDetailResponse>;

// ── Response DTOs ─────────────────────────────────────────────────────────────

public sealed record MealDetailResponse(
    Guid MealId,
    Guid ChefId,
    string Name,
    string? Description,
    string? ImageUrl,
    bool IsAvailable,
    string DishType,
    string? CuisineType,
    IReadOnlyList<VariantDetailResponse> Variants,
    IReadOnlyList<SideDishDetailResponse> SideDishes,
    IReadOnlyList<ToppingGroupDetailResponse> ToppingGroups);

public sealed record VariantDetailResponse(
    Guid VariantId,
    string Name,
    decimal Price,
    string Currency,
    bool IsDefault);

public sealed record SideDishDetailResponse(
    Guid SideDishId,
    string Name,
    string? Description,
    decimal Price,
    string Currency,
    bool IsRequired);

public sealed record ToppingGroupDetailResponse(
    Guid ToppingGroupId,
    string Name,
    int MinSelections,
    int MaxSelections,
    IReadOnlyList<ToppingOptionDetailResponse> Options);

public sealed record ToppingOptionDetailResponse(
    Guid ToppingOptionId,
    string Name,
    decimal ExtraPrice,
    string Currency);

// ── Handler ───────────────────────────────────────────────────────────────────

internal sealed class GetMealByIdQueryHandler(IApplicationDbContext dbContext)
    : IQueryHandler<GetMealByIdQuery, MealDetailResponse>
{
    public async Task<Result<MealDetailResponse>> Handle(
        GetMealByIdQuery query,
        CancellationToken cancellationToken)
    {
        Meal? meal = await dbContext.Meals
            .Include(m => m.Variants)
            .Include(m => m.SideDishes)
            .Include(m => m.ToppingGroups)
                .ThenInclude(g => g.Options)
            .FirstOrDefaultAsync(m => m.Id == query.MealId, cancellationToken);

        if (meal is null)
            return Result.Failure<MealDetailResponse>(MealErrors.NotFound(query.MealId));

        return Result.Success(new MealDetailResponse(
            MealId:       meal.Id,
            ChefId:       meal.ChefId,
            Name:         meal.Name,
            Description:  meal.Description,
            ImageUrl:     meal.ImageUrl,
            IsAvailable:  meal.IsAvailable,
            DishType:     meal.DishType.ToString(),
            CuisineType:  meal.CuisineType,
            Variants: meal.Variants.Select(v => new VariantDetailResponse(
                VariantId: v.Id,
                Name:      v.Name,
                Price:     v.Price.Amount,
                Currency:  v.Price.Currency,
                IsDefault: v.IsDefault)).ToList(),
            SideDishes: meal.SideDishes.Select(s => new SideDishDetailResponse(
                SideDishId:  s.Id,
                Name:        s.Name,
                Description: s.Description,
                Price:       s.Price.Amount,
                Currency:    s.Price.Currency,
                IsRequired:  s.IsRequired)).ToList(),
            ToppingGroups: meal.ToppingGroups.Select(g => new ToppingGroupDetailResponse(
                ToppingGroupId: g.Id,
                Name:           g.Name,
                MinSelections:  g.MinSelections,
                MaxSelections:  g.MaxSelections,
                Options: g.Options.Select(o => new ToppingOptionDetailResponse(
                    ToppingOptionId: o.Id,
                    Name:            o.Name,
                    ExtraPrice:      o.ExtraPrice.Amount,
                    Currency:        o.ExtraPrice.Currency)).ToList())).ToList()
        ));
    }
}

internal sealed class GetMealByIdQueryValidator : AbstractValidator<GetMealByIdQuery>
{
    public GetMealByIdQueryValidator() => RuleFor(x => x.MealId).NotEmpty();
}
