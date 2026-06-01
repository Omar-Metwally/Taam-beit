using Application.Abstractions.Data;
using Application.Abstractions.Geospatial;
using Application.Abstractions.Messaging;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.GetNearbyChefMeals;

public enum ChefSortOrder
{
    Closest       = 0,
    HighestRated  = 1,
    NewArrivals   = 2,
    PriceLowHigh  = 3,
    PriceHighLow  = 4,
}

public sealed record GetNearbyChefMealsQuery(
    double Latitude,
    double Longitude,
    double RadiusKm        = 10,
    DishType? DishType     = null,
    string? CuisineType    = null,
    decimal? MaxPrice      = null,
    ChefSortOrder SortOrder = ChefSortOrder.Closest
) : IQuery<List<ChefCardResponse>>;

public sealed record ChefCardResponse(
    Guid ChefUserId,
    string FullName,
    string? AvatarUrl,
    IReadOnlyList<string> CuisineTypes,
    double Rating,
    double DistanceKm,
    string? OperationAddressLine,
    int TotalMeals,
    decimal FromPrice,
    string Currency,
    bool IsCertified,
    IReadOnlyList<MealPreviewResponse> MealPreviews);

public sealed record MealPreviewResponse(
    Guid MealId,
    string Name,
    string? ImageUrl);

internal sealed class GetNearbyChefMealsQueryHandler(
    IApplicationDbContext dbContext,
    IGeospatialService geospatialService)
    : IQueryHandler<GetNearbyChefMealsQuery, List<ChefCardResponse>>
{
    public async Task<Result<List<ChefCardResponse>>> Handle(
        GetNearbyChefMealsQuery query,
        CancellationToken cancellationToken)
    {
        // Step 1: PostGIS proximity
        var nearbyChefs = await geospatialService.FindChefsNearLocationAsync(
            query.Latitude,
            query.Longitude,
            query.RadiusKm,
            cancellationToken);

        if (nearbyChefs.Count == 0)
            return Result.Success(new List<ChefCardResponse>());

        var nearbyIds = nearbyChefs.Select(c => c.ChefUserId).ToList();
        var distanceMap = nearbyChefs.ToDictionary(c => c.ChefUserId, c => c.DistanceKm);

        // Step 2: Load approved chefs
        var chefs = await dbContext.Users
            .Where(u =>
                nearbyIds.Contains(u.Id) &&
                u.ChefProfile != null &&
                u.ChefProfile.Status == ProfileStatus.Approved)
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                AvatarUrl = u.ChefProfile!.AvatarUrl,
                AddressLine = u.ChefProfile.OperationLocation != null
                    ? u.ChefProfile.OperationLocation.AddressLine
                    : null,
                IsCertified = true
            })
            .ToListAsync(cancellationToken);

        // Step 3: Load meals
        var cuisineNormalized = query.CuisineType?.ToLowerInvariant();

        var meals = await dbContext.Meals
            .Where(m =>
                nearbyIds.Contains(m.ChefId) &&
                m.Status == MealStatus.Active &&
                m.Variants.Any())
            .Where(m => query.DishType == null || m.DishType == query.DishType)
            .Where(m =>
                cuisineNormalized == null ||
                (m.CuisineType != null && m.CuisineType.ToLower() == cuisineNormalized))
            .Include(m => m.Variants)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync(cancellationToken);

        var mealsByChef = meals
            .GroupBy(m => m.ChefId)
            .ToDictionary(g => g.Key, g => g.ToList());

        // Step 4: Build cards
        var cards = chefs
            .Select(c =>
            {
                if (!mealsByChef.TryGetValue(c.Id, out var chefMeals))
                    return null;

                var mealsWithPrice = chefMeals
                    .Select(m =>
                    {
                        var defaultVariant = m.Variants.FirstOrDefault(v => v.IsDefault)
                            ?? m.Variants.First();
                        return new
                        {
                            Meal = m,
                            DefaultPrice = defaultVariant.Price.Amount,
                            Currency = defaultVariant.Price.Currency
                        };
                    })
                    .Where(x => query.MaxPrice == null || x.DefaultPrice <= query.MaxPrice)
                    .ToList();

                if (mealsWithPrice.Count == 0)
                    return null;

                var fromPrice = mealsWithPrice.Min(x => x.DefaultPrice);
                var currency  = mealsWithPrice.First().Currency;

                var cuisines = mealsWithPrice
                    .Where(x => x.Meal.CuisineType != null)
                    .Select(x => x.Meal.CuisineType!)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                if (!distanceMap.TryGetValue(c.Id, out var distance))
                    distance = 0;

                return new ChefCardResponse(
                    ChefUserId:           c.Id,
                    FullName:             $"{c.FirstName} {c.LastName}",
                    AvatarUrl:            c.AvatarUrl,
                    CuisineTypes:         cuisines,
                    Rating:               0.0,
                    DistanceKm:           Math.Round(distance, 1),
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

        // Step 5: Sort
        var sorted = query.SortOrder switch
        {
            ChefSortOrder.Closest      => cards.OrderBy(c => c.DistanceKm).ToList(),
            ChefSortOrder.HighestRated => cards.OrderByDescending(c => c.Rating).ToList(),
            ChefSortOrder.NewArrivals  => cards
                .OrderByDescending(c => mealsByChef[c.ChefUserId].Max(m => m.CreatedAt))
                .ToList(),
            ChefSortOrder.PriceLowHigh => cards.OrderBy(c => c.FromPrice).ToList(),
            ChefSortOrder.PriceHighLow => cards.OrderByDescending(c => c.FromPrice).ToList(),
            _                          => cards
        };

        return Result.Success(sorted);
    }
}

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
