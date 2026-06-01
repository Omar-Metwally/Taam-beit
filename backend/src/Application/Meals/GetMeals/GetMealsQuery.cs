
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Meals.GetNearbyChefMeals;
using Domain.Meals;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.GetMeals;

/// <summary>
/// Returns all meals belonging to a chef.
/// </summary>
///

public sealed record GetMealsQuery(
    Guid ChefId
) : IQuery<List<MealSummaryResponse>>;

public sealed record MealVariant(
    Guid VariantId,
    string Name,
    decimal Price,
    string Currency,
    bool IsDefault
);

public sealed record SideDish(
    Guid SideDishId,
    string Name,
    decimal Price,
    string Currency,
    bool IsRequired
);

public sealed record ToppingOption(
    Guid ToppingOptionId,
    string Name,
    decimal ExtraPrice,
    string Currency
);

public sealed record ToppingGroup(
    Guid ToppingGroupId,
    string Name,
    int MinSelections,
    int MaxSelections,
    IReadOnlyList<ToppingOption> Options
);

public sealed record MealSummaryResponse(
    Guid MealId,
    string Name,
    string? Description,
    string? ImageUrl,
    bool IsAvailable,
    string DishType,
    string? CuisineType,
    IReadOnlyList<MealVariant> Variants,
    IReadOnlyList<SideDish> SideDishes,
    IReadOnlyList<ToppingGroup> ToppingGroups
);

internal sealed class GetMealsQueryHandler(
    IApplicationDbContext dbContext)
    : IQueryHandler<GetMealsQuery, List<MealSummaryResponse>>
{
    public async Task<Result<List<MealSummaryResponse>>> Handle(
        GetMealsQuery query, 
        CancellationToken cancellationToken)
    {
        var meals = await dbContext.Meals
             .AsNoTracking()
             .Where(m =>
                 m.ChefId == query.ChefId &&
                 m.Status == MealStatus.Active)
             .OrderByDescending(m => m.CreatedAt)
             .Select(m => new MealSummaryResponse(
                 MealId: m.Id,
                 Name: m.Name,
                 Description: m.Description,
                 ImageUrl: m.ImageUrl,
                 IsAvailable: m.IsAvailable,
                 DishType: m.DishType.ToString(),
                 CuisineType: m.CuisineType,

                 Variants: m.Variants
                     .OrderByDescending(v => v.IsDefault)
                     .Select(v => new MealVariant(
                         VariantId: v.Id,
                         Name: v.Name,
                         Price: v.Price.Amount,
                         Currency: v.Price.Currency,
                         IsDefault: v.IsDefault
                     ))
                     .ToList(),

                 SideDishes: m.SideDishes
                     .Select(sd => new SideDish(
                         SideDishId: sd.Id,
                         Name: sd.Name,
                         Price: sd.Price.Amount,
                         Currency: sd.Price.Currency,
                         IsRequired: sd.IsRequired
                     ))
                     .ToList(),

                 ToppingGroups: m.ToppingGroups
                     .Select(tg => new ToppingGroup(
                         ToppingGroupId: tg.Id,
                         Name: tg.Name,
                         MinSelections: tg.MinSelections,
                         MaxSelections: tg.MaxSelections,

                         Options: tg.Options
                             .Select(o => new ToppingOption(
                                 ToppingOptionId: o.Id,
                                 Name: o.Name,
                                 ExtraPrice: o.ExtraPrice.Amount,
                                 Currency: o.ExtraPrice.Currency
                             ))
                             .ToList()
                     ))
                     .ToList()
             ))
             .ToListAsync(cancellationToken);

        return Result.Success(meals);
    }
}
