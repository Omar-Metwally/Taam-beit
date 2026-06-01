using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Meals;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.GetChefMeals;

/// <summary>
/// Returns all meals belonging to the authenticated chef, split by status.
/// Active + Draft meals go into the main list.
/// Archived meals are returned separately for the "Archived" section.
/// </summary>
public sealed record GetChefMealsQuery : IQuery<ChefMealsResponse>;

public sealed record ChefMealsResponse(
    List<ChefMealSummary> Meals,
    List<ChefMealSummary> ArchivedMeals);

public sealed record ChefMealSummary(
    Guid Id,
    string Name,
    string? Description,
    DishType DishType,
    string? CuisineType,
    MealStatus Status,
    string? ImageUrl,
    int VariantCount,
    decimal? MinPrice,
    decimal? MaxPrice,
    string? Currency,
    DateTime CreatedAt,
    DateTime? ArchivedAt);

internal sealed class GetChefMealsQueryHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : IQueryHandler<GetChefMealsQuery, ChefMealsResponse>
{
    public async Task<Result<ChefMealsResponse>> Handle(
        GetChefMealsQuery query,
        CancellationToken cancellationToken)
    {
        var meals = await dbContext.Meals
            .AsNoTracking()
            .Where(m => m.ChefId == userContext.UserId)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync(cancellationToken);

        var summaries = meals.Select(ToSummary).ToList();

        return Result.Success(new ChefMealsResponse(
            Meals: summaries.Where(s => s.Status != MealStatus.Archived).ToList(),
            ArchivedMeals: summaries.Where(s => s.Status == MealStatus.Archived).ToList()));
    }

    private static ChefMealSummary ToSummary(Meal m)
    {
        var prices = m.Variants.Select(v => v.Price.Amount).ToList();
        var currency = m.Variants.FirstOrDefault()?.Price.Currency;

        return new ChefMealSummary(
            Id: m.Id,
            Name: m.Name,
            Description: m.Description,
            DishType: m.DishType,
            CuisineType: m.CuisineType,
            Status: m.Status,
            ImageUrl: m.ImageUrl,
            VariantCount: m.Variants.Count,
            MinPrice: prices.Count > 0 ? prices.Min() : null,
            MaxPrice: prices.Count > 0 ? prices.Max() : null,
            Currency: currency,
            CreatedAt: m.CreatedAt,
            ArchivedAt: m.ArchivedAt);
    }
}