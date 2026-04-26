using Application.Abstractions.Data;
using Application.Abstractions.Geospatial;
using Application.Abstractions.Messaging;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.GetNearbyChefMeals;

// ── Sort options ──────────────────────────────────────────────────────────────

public enum ChefSortOrder
{
    Closest       = 0,
    HighestRated  = 1,  // placeholder until reviews built — sorts by name for now
    NewArrivals   = 2,  // chefs with most recently added meals first
    PriceLowHigh  = 3,
    PriceHighLow  = 4,
}

// ── Query ─────────────────────────────────────────────────────────────────────

public sealed record GetNearbyChefMealsQuery(
    double Latitude,
    double Longitude,
    double RadiusKm        = 10,
    DishType? DishType     = null,   // null = all dish types
    string? CuisineType    = null,   // null = all cuisines
    decimal? MaxPrice      = null,   // null = no price cap
    ChefSortOrder SortOrder = ChefSortOrder.Closest
) : IQuery<List<ChefCardResponse>>;

// ── Response DTOs ─────────────────────────────────────────────────────────────

/// <summary>
/// Chef card shown on the browse/menu page.
/// Customer picks a chef first, then browses that chef's full menu.
/// This enforces the one-chef-per-order constraint naturally in the UX.
/// </summary>
public sealed record ChefCardResponse(
    Guid ChefUserId,
    string FullName,
    string? AvatarUrl,
    IReadOnlyList<string> CuisineTypes,  // distinct cuisine tags from chef's meals
    double Rating,                         // 0.0 placeholder until reviews feature
    double DistanceKm,
    string? OperationAddressLine,
    int TotalMeals,
    decimal FromPrice,                     // lowest default variant price
    string Currency,
    bool IsCertified,
    IReadOnlyList<MealPreviewResponse> MealPreviews  // first 3 meals for card strip
);

public sealed record MealPreviewResponse(
    Guid MealId,
    string Name,
    string? ImageUrl
);

// ── Handler ───────────────────────────────────────────────────────────────────

internal sealed class GetNearbyChefMealsQueryHandler(
    IApplicationDbContext dbContext,
    IGeospatialService geospatialService)
    : IQueryHandler<GetNearbyChefMealsQuery, List<ChefCardResponse>>
{
    public async Task<Result<List<ChefCardResponse>>> Handle(
        GetNearbyChefMealsQuery query,
        CancellationToken cancellationToken)
    {
        // Step 1: PostGIS proximity — O(log n) via GIST index
        var nearbyChefs = await geospatialService.FindChefsNearLocationAsync(
            query.Latitude,
            query.Longitude,
            query.RadiusKm,
            cancellationToken);

        if (nearbyChefs.Count == 0)
            return Result.Success(new List<ChefCardResponse>());

        var nearbyIds = nearbyChefs.Select(c => c.ChefUserId).ToList();
        var distanceMap = nearbyChefs.ToDictionary(c => c.ChefUserId, c => c.DistanceKm);

        // Step 2: Load chefs + their available meals, applying filters in SQL
        var chefData = await dbContext.Users
            .Where(u =>
                nearbyIds.Contains(u.Id) &&
                u.ChefProfile != null &&
                u.ChefProfile.Status == ProfileStatus.Approved)
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                AvatarUrl       = u.ChefProfile!.AvatarUrl,
                AddressLine     = u.ChefProfile.OperationLocation.AddressLine,
                IsCertified     = true, // all approved chefs are certified

                // Apply DishType and CuisineType filters in DB
                Meals = dbContext.Meals
                    .Where(m =>
                        m.ChefId == u.Id &&
                        m.IsAvailable &&
                        (query.DishType   == null || m.DishType    == query.DishType) &&
                        (query.CuisineType == null || m.CuisineType == query.CuisineType))
                    .Include(m => m.Variants)
                    .OrderBy(m => m.CreatedAt)
                    .ToList()
            })
            .ToListAsync(cancellationToken);

        // Step 3: Apply price filter and build chef cards
        var cards = chefData
            .Select(c =>
            {
                // Get default variant price for each meal
                var mealsWithPrice = c.Meals
                    .Select(m => new
                    {
                        Meal = m,
                        DefaultPrice = m.Variants
                            .Where(v => v.IsDefault)
                            .Select(v => v.Price.Amount)
                            .FirstOrDefault()
                    })
                    .Where(x => query.MaxPrice == null || x.DefaultPrice <= query.MaxPrice)
                    .ToList();;

                if (mealsWithPrice.Count == 0) return null;

                var fromPrice  = mealsWithPrice.Min(x => x.DefaultPrice);
                var currency   = mealsWithPrice
                    .First().Meal.Variants
                    .First(v => v.IsDefault).Price.Currency;

                var cuisines   = mealsWithPrice
                    .Where(x => x.Meal.CuisineType != null)
                    .Select(x => x.Meal.CuisineType!)
                    .Distinct()
                    .ToList();

                return new ChefCardResponse(
                    ChefUserId:           c.Id,
                    FullName:             $"{c.FirstName} {c.LastName}",
                    AvatarUrl:            c.AvatarUrl,
                    CuisineTypes:         cuisines,
                    Rating:               0.0,      // placeholder — reviews feature pending
                    DistanceKm:           Math.Round(distanceMap[c.Id], 1),
                    OperationAddressLine: c.AddressLine,
                    TotalMeals:           mealsWithPrice.Count,
                    FromPrice:            fromPrice,
                    Currency:             currency,
                    IsCertified:          c.IsCertified,
                    MealPreviews:         mealsWithPrice
                        .Take(3)
                        .Select(x => new MealPreviewResponse(
                            MealId:   x.Meal.Id,
                            Name:     x.Meal.Name,
                            ImageUrl: x.Meal.ImageUrl))
                        .ToList()
                );
            })
            .Where(c => c != null)
            .Select(c => c!)
            .ToList();

        // Step 4: Sort
        var sorted = query.SortOrder switch
        {
            ChefSortOrder.Closest      => cards.OrderBy(c => c.DistanceKm).ToList(),
            ChefSortOrder.HighestRated => cards.OrderByDescending(c => c.Rating).ToList(),
            ChefSortOrder.NewArrivals  => cards.ToList(), // already ordered by meal CreatedAt
            ChefSortOrder.PriceLowHigh => cards.OrderBy(c => c.FromPrice).ToList(),
            ChefSortOrder.PriceHighLow => cards.OrderByDescending(c => c.FromPrice).ToList(),
            _                          => cards
        };

        return Result.Success(sorted);
    }
}

// ── Validator ─────────────────────────────────────────────────────────────────

internal sealed class GetNearbyChefMealsQueryValidator
    : AbstractValidator<GetNearbyChefMealsQuery>
{
    public GetNearbyChefMealsQueryValidator()
    {
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
        RuleFor(x => x.RadiusKm).GreaterThan(0).LessThanOrEqualTo(50);
        RuleFor(x => x.MaxPrice).GreaterThan(0).When(x => x.MaxPrice.HasValue);
        RuleFor(x => x.SortOrder).IsInEnum();
    }
}
