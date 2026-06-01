using Api.Extensions;
using Application.Abstractions.Messaging;
using Application.Meals.GetMealById;
using Application.Meals.GetNearbyChefMeals;
using Domain.Meals;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Application.Meals.GetMeals;

namespace Api.Controllers;

/// <summary>
/// Public meal discovery and browsing — no authentication required.
/// Customers use these endpoints to find meals and view details.
/// </summary>
[ApiController]
[Route("api/meals")]
[AllowAnonymous]
public sealed class PublicMealsController(
    IQueryHandler<GetMealsQuery, List<MealSummaryResponse>> getMealsHandler,
    IQueryHandler<GetNearbyChefMealsQuery, List<ChefCardResponse>> getNearbyHandler,
    IQueryHandler<GetMealByIdQuery, MealDetailResponse> getMealByIdHandler)
    : ControllerBase
{
    /// <summary>
    /// Browse a specific chef's published menu.
    /// Returns only available (IsAvailable=true) meals.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetMeals(
        [FromQuery] Guid chefId,
        CancellationToken ct = default) =>
        (await getMealsHandler.Handle(
            new GetMealsQuery(chefId), ct))
            .ToActionResult();

    /// <summary>
    /// Discover nearby chefs with meal previews.
    /// </summary>
    [HttpGet("nearby")]
    public async Task<IActionResult> GetNearbyChefs(
        [FromQuery] double latitude,
        [FromQuery] double longitude,
        [FromQuery] double radiusKm = 10.0,
        [FromQuery] DishType? dishType = null,
        [FromQuery] string? cuisineType = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] ChefSortOrder sortOrder = ChefSortOrder.Closest,
        CancellationToken ct = default) =>
        (await getNearbyHandler.Handle(
            new GetNearbyChefMealsQuery(
                latitude, longitude, radiusKm,
                dishType, cuisineType, maxPrice, sortOrder),
            ct))
            .ToActionResult();

    /// <summary>
    /// Get full meal details (public view).
    /// </summary>
    [HttpGet("{mealId:guid}", Name = "GetMealById")]
    public async Task<IActionResult> GetMealById(Guid mealId, CancellationToken ct) =>
        (await getMealByIdHandler.Handle(new GetMealByIdQuery(mealId), ct))
            .ToActionResult();
}
