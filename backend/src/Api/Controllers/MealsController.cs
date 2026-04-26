using Api.Extensions;
using Application.Abstractions.Messaging;
using Application.Meals.AddSideDish;
using Application.Meals.AddToppingGroup;
using Application.Meals.AddMealVariant;
using Application.Meals.AddToppingOption;
using Application.Meals.RemoveMealVariant;
using Application.Meals.SetDefaultMealVariant;
using Application.Meals.UpdateMealVariant;
using Application.Meals.UploadMealImage;
using Application.Meals.CreateMeal;
using Application.Meals.GetMealById;
using Application.Meals.GetNearbyChefMeals;
using Domain.Meals;
using Application.Meals.SetMealAvailability;
using Application.Meals.UpdateMeal;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/meals")]
public sealed class MealsController(
    ICommandHandler<CreateMealCommand, Guid> createMealHandler,
    ICommandHandler<UpdateMealCommand> updateMealHandler,
    ICommandHandler<SetMealAvailabilityCommand> setAvailabilityHandler,
    ICommandHandler<AddSideDishCommand> addSideDishHandler,
    ICommandHandler<AddToppingGroupCommand, Guid> addToppingGroupHandler,
    ICommandHandler<AddToppingOptionCommand> addToppingOptionHandler,
    IQueryHandler<GetNearbyChefMealsQuery, List<ChefCardResponse>> getNearbyHandler,
    IQueryHandler<GetMealByIdQuery, MealDetailResponse> getMealByIdHandler,
    ICommandHandler<AddMealVariantCommand, Guid> addVariantHandler,
    ICommandHandler<UpdateMealVariantCommand> updateVariantHandler,
    ICommandHandler<RemoveMealVariantCommand> removeVariantHandler,
    ICommandHandler<SetDefaultMealVariantCommand> setDefaultVariantHandler,
    ICommandHandler<UploadMealImageCommand, MealImageUploadResponse> uploadImageHandler)
    : ControllerBase
{
    // ── Public — nearby meals discovery ──────────────────────────────────────

    [HttpGet("nearby")]
    [AllowAnonymous]
    public async Task<IActionResult> GetNearbyChefs(
        [FromQuery] double latitude,
        [FromQuery] double longitude,
        [FromQuery] double radiusKm       = 10.0,
        [FromQuery] DishType? dishType    = null,
        [FromQuery] string? cuisineType   = null,
        [FromQuery] decimal? maxPrice     = null,
        [FromQuery] ChefSortOrder sortOrder = ChefSortOrder.Closest,
        CancellationToken ct = default) =>
        (await getNearbyHandler.Handle(
            new GetNearbyChefMealsQuery(
                latitude, longitude, radiusKm,
                dishType, cuisineType, maxPrice, sortOrder),
            ct))
            .ToActionResult();

    [HttpGet("{mealId:guid}", Name = "GetMealById")]
    [AllowAnonymous]
    public async Task<IActionResult> GetMealById(Guid mealId, CancellationToken ct) =>
        (await getMealByIdHandler.Handle(new GetMealByIdQuery(mealId), ct))
            .ToActionResult();

    // ── Chef — meal management ────────────────────────────────────────────────

    // ── Variants ──────────────────────────────────────────────────────────────

    [HttpPost("{mealId:guid}/variants")]
    [Authorize(Roles = "Chef")]
    public async Task<IActionResult> AddVariant(
        Guid mealId,
        [FromBody] AddVariantRequest request,
        CancellationToken ct)
    {
        var result = await addVariantHandler.Handle(
            new AddMealVariantCommand(mealId, request.Name, request.Price, request.Currency), ct);
        return result.IsSuccess
            ? Ok(new { variantId = result.Value })
            : result.ToActionResult();
    }

    [HttpPut("{mealId:guid}/variants/{variantId:guid}")]
    [Authorize(Roles = "Chef")]
    public async Task<IActionResult> UpdateVariant(
        Guid mealId,
        Guid variantId,
        [FromBody] AddVariantRequest request,
        CancellationToken ct) =>
        (await updateVariantHandler.Handle(
            new UpdateMealVariantCommand(mealId, variantId, request.Name, request.Price, request.Currency), ct))
            .ToActionResult();

    [HttpDelete("{mealId:guid}/variants/{variantId:guid}")]
    [Authorize(Roles = "Chef")]
    public async Task<IActionResult> RemoveVariant(
        Guid mealId,
        Guid variantId,
        CancellationToken ct) =>
        (await removeVariantHandler.Handle(new RemoveMealVariantCommand(mealId, variantId), ct))
            .ToActionResult();

    [HttpPut("{mealId:guid}/variants/{variantId:guid}/set-default")]
    [Authorize(Roles = "Chef")]
    public async Task<IActionResult> SetDefaultVariant(
        Guid mealId,
        Guid variantId,
        CancellationToken ct) =>
        (await setDefaultVariantHandler.Handle(
            new SetDefaultMealVariantCommand(mealId, variantId), ct))
            .ToActionResult();

    // ── Image upload ──────────────────────────────────────────────────────────

    [HttpPost("{mealId:guid}/image")]
    [Authorize(Roles = "Chef")]
    [RequestSizeLimit(15 * 1024 * 1024)] // 15 MB raw input — processed down to WebP variants
    public async Task<IActionResult> UploadMealImage(
        Guid mealId,
        IFormFile image,
        CancellationToken ct)
    {
        var result = await uploadImageHandler.Handle(
            new UploadMealImageCommand(
                mealId,
                image.ContentType,
                image.OpenReadStream()), ct);

        return result.IsSuccess
            ? Ok(result.Value)   // returns SmallUrl, MediumUrl, LargeUrl
            : result.ToActionResult();
    }

    [HttpPost]
    [Authorize(Roles = "Chef")]
    public async Task<IActionResult> CreateMeal(
        [FromBody] CreateMealRequest request,
        CancellationToken ct)
    {
        var result = await createMealHandler.Handle(
            new CreateMealCommand(
                request.Name,
                request.Description,
                request.DefaultVariantName,
                request.DefaultVariantPrice,
                request.Currency,
                request.DishType,
                request.CuisineType),
            ct);
        return result.IsSuccess
            ? Ok(new { mealId = result.Value })
            : result.ToActionResult();
    }

    [HttpPut("{mealId:guid}")]
    [Authorize(Roles = "Chef")]
    public async Task<IActionResult> UpdateMeal(
        Guid mealId,
        [FromBody] UpdateMealRequest request,
        CancellationToken ct) =>
        (await updateMealHandler.Handle(
            new UpdateMealCommand(mealId, request.Name, request.Description,
                request.BasePrice, request.Currency), ct))
            .ToActionResult();

    [HttpPatch("{mealId:guid}/availability")]
    [Authorize(Roles = "Chef")]
    public async Task<IActionResult> SetAvailability(
        Guid mealId,
        [FromBody] bool isAvailable,
        CancellationToken ct) =>
        (await setAvailabilityHandler.Handle(
            new SetMealAvailabilityCommand(mealId, isAvailable), ct))
            .ToActionResult();

    // ── Side dishes ───────────────────────────────────────────────────────────

    [HttpPost("{mealId:guid}/side-dishes")]
    [Authorize(Roles = "Chef")]
    public async Task<IActionResult> AddSideDish(
        Guid mealId,
        [FromBody] AddSideDishRequest request,
        CancellationToken ct) =>
        (await addSideDishHandler.Handle(
            new AddSideDishCommand(mealId, request.Name, request.Description,
                request.Price, request.Currency, request.IsRequired), ct))
            .ToActionResult();

    // ── Topping groups ────────────────────────────────────────────────────────

    [HttpPost("{mealId:guid}/topping-groups")]
    [Authorize(Roles = "Chef")]
    public async Task<IActionResult> AddToppingGroup(
        Guid mealId,
        [FromBody] AddToppingGroupRequest request,
        CancellationToken ct)
    {
        var result = await addToppingGroupHandler.Handle(
            new AddToppingGroupCommand(mealId, request.Name,
                request.MinSelections, request.MaxSelections), ct);

        return result.IsSuccess
            ? Ok(new { toppingGroupId = result.Value })
            : result.ToActionResult();
    }

    [HttpPost("{mealId:guid}/topping-groups/{groupId:guid}/options")]
    [Authorize(Roles = "Chef")]
    public async Task<IActionResult> AddToppingOption(
        Guid mealId,
        Guid groupId,
        [FromBody] AddToppingOptionRequest request,
        CancellationToken ct) =>
        (await addToppingOptionHandler.Handle(
            new AddToppingOptionCommand(mealId, groupId, request.Name,
                request.ExtraPrice, request.Currency), ct))
            .ToActionResult();
}

// ── Request shapes ────────────────────────────────────────────────────────────

public sealed record AddVariantRequest(
    string Name,
    decimal Price,
    string Currency);

public sealed record CreateMealRequest(
    string Name,
    string? Description,
    string DefaultVariantName,
    decimal DefaultVariantPrice,
    string Currency,
    DishType DishType,
    string? CuisineType);

public sealed record UpdateMealRequest(
    string Name,
    string? Description,
    decimal BasePrice,
    string Currency);

public sealed record AddSideDishRequest(
    string Name,
    string? Description,
    decimal Price,
    string Currency,
    bool IsRequired);

public sealed record AddToppingGroupRequest(
    string Name,
    int MinSelections,
    int MaxSelections);

public sealed record AddToppingOptionRequest(
    string Name,
    decimal ExtraPrice,
    string Currency);
