using Api.Extensions;
using Application.Abstractions.Messaging;
using Application.Meals.AddMealVariant;
using Application.Meals.AddSideDish;
using Application.Meals.AddToppingGroup;
using Application.Meals.AddToppingOption;
using Application.Meals.ArchiveMeal;
using Application.Meals.CreateMeal;
using Application.Meals.GetChefMeals;
using Application.Meals.RemoveMealVariant;
using Application.Meals.RestoreMeal;
using Application.Meals.SetDefaultMealVariant;
using Application.Meals.SetMealAvailability;
using Application.Meals.UpdateMeal;
using Application.Meals.UpdateMealVariant;
using Application.Meals.UploadMealImage;
using Domain.Meals;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

/// <summary>
/// Chef meal management — create, edit, and manage the chef's own menu.
/// All endpoints require Chef role and operate on the authenticated chef's meals.
/// </summary>
[ApiController]
[Route("api/chef/meals")]
[Authorize(Roles = "Chef")]
public sealed class ChefMealsController(
    ICommandHandler<CreateMealCommand, Guid> createMealHandler,
    ICommandHandler<UpdateMealCommand> updateMealHandler,
    ICommandHandler<SetMealAvailabilityCommand> setAvailabilityHandler,
    ICommandHandler<ArchiveMealCommand> archiveMealHandler,
    ICommandHandler<RestoreMealCommand> restoreMealHandler,
    ICommandHandler<AddMealVariantCommand, Guid> addVariantHandler,
    ICommandHandler<UpdateMealVariantCommand> updateVariantHandler,
    ICommandHandler<RemoveMealVariantCommand> removeVariantHandler,
    ICommandHandler<SetDefaultMealVariantCommand> setDefaultVariantHandler,
    ICommandHandler<UploadMealImageCommand, MealImageUploadResponse> uploadImageHandler,
    ICommandHandler<AddSideDishCommand, Guid> addSideDishHandler,
    ICommandHandler<AddToppingGroupCommand, Guid> addToppingGroupHandler,
    ICommandHandler<AddToppingOptionCommand> addToppingOptionHandler,
    IQueryHandler<GetChefMealsQuery, ChefMealsResponse> getChefMealsHandler)
    : ControllerBase
{
    // ── Dashboard ────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetMyMeals(CancellationToken ct) =>
        (await getChefMealsHandler.Handle(new GetChefMealsQuery(), ct))
            .ToActionResult();

    // ── Meal CRUD ────────────────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> CreateMeal(
        [FromBody] CreateMealRequest request,
        CancellationToken ct)
    {
        var result = await createMealHandler.Handle(
            new CreateMealCommand(
                request.Name,
                request.Description,
                request.DishType,
                request.CuisineType),
            ct);

        return result.IsSuccess
            ? CreatedAtRoute("GetMealById", new { mealId = result.Value }, new { mealId = result.Value })
            : result.ToActionResult();
    }

    [HttpPut("{mealId:guid}")]
    public async Task<IActionResult> UpdateMeal(
        Guid mealId,
        [FromBody] UpdateMealRequest request,
        CancellationToken ct) =>
        (await updateMealHandler.Handle(
            new UpdateMealCommand(
                mealId,
                request.Name,
                request.Description,
                request.DishType,
                request.CuisineType),
            ct))
            .ToActionResult();

        [HttpPatch("{mealId:guid}/availability")]
        [Authorize]
        public async Task<IActionResult> SetAvailability(
            Guid mealId,
            [FromBody] SetAvailabilityRequest request,
            CancellationToken ct) =>
            (await setAvailabilityHandler.Handle(
                new SetMealAvailabilityCommand(mealId, request.IsAvailable), ct))
                .ToActionResult();

        /// <summary>
        /// Archives a meal. Returns 409 if there are active or pending orders.
        /// The meal is preserved in the database for order history.
        /// </summary>
        [HttpPost("{mealId:guid}/archive")]
        [Authorize]
        public async Task<IActionResult> ArchiveMeal(Guid mealId, CancellationToken ct) =>
            (await archiveMealHandler.Handle(new ArchiveMealCommand(mealId), ct))
                .ToActionResult();

        /// <summary>
        /// Restores an archived meal back to Draft status.
        /// </summary>
        [HttpPost("{mealId:guid}/restore")]
        [Authorize]
        public async Task<IActionResult> RestoreMeal(Guid mealId, CancellationToken ct) =>
            (await restoreMealHandler.Handle(new RestoreMealCommand(mealId), ct))
                .ToActionResult();


    // ── Variants ───────────────────────────────────────────────────────────

    [HttpPost("{mealId:guid}/variants")]
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
    public async Task<IActionResult> UpdateVariant(
        Guid mealId,
        Guid variantId,
        [FromBody] AddVariantRequest request,
        CancellationToken ct) =>
        (await updateVariantHandler.Handle(
            new UpdateMealVariantCommand(mealId, variantId, request.Name, request.Price, request.Currency), ct))
            .ToActionResult();

    [HttpDelete("{mealId:guid}/variants/{variantId:guid}")]
    public async Task<IActionResult> RemoveVariant(
        Guid mealId,
        Guid variantId,
        CancellationToken ct) =>
        (await removeVariantHandler.Handle(new RemoveMealVariantCommand(mealId, variantId), ct))
            .ToActionResult();

    [HttpPut("{mealId:guid}/variants/{variantId:guid}/set-default")]
    public async Task<IActionResult> SetDefaultVariant(
        Guid mealId,
        Guid variantId,
        CancellationToken ct) =>
        (await setDefaultVariantHandler.Handle(
            new SetDefaultMealVariantCommand(mealId, variantId), ct))
            .ToActionResult();

    // ── Image ────────────────────────────────────────────────────────────────

    [HttpPost("{mealId:guid}/image")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> UploadMealImage(
        Guid mealId,
        IFormFile? image,
        CancellationToken ct)
    {
        if (image is null)
            return BadRequest(new { error = "No image file provided." });

        var result = await uploadImageHandler.Handle(
            new UploadMealImageCommand(
                mealId,
                image.ContentType,
                image.OpenReadStream()),
            ct);

        return result.IsSuccess
            ? Ok(result.Value)
            : result.ToActionResult();
    }

    // ── Side Dishes ──────────────────────────────────────────────────────────

    [HttpPost("{mealId:guid}/side-dishes")]
    public async Task<IActionResult> AddSideDish(
        Guid mealId,
        [FromBody] AddSideDishRequest request,
        CancellationToken ct) =>
        (await addSideDishHandler.Handle(
            new AddSideDishCommand(mealId, request.Name, request.Description,
                request.Price, request.Currency, request.IsRequired), ct))
            .ToActionResult();

    // ── Topping Groups ───────────────────────────────────────────────────────

    [HttpPost("{mealId:guid}/topping-groups")]
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

// ── Request shapes (shared with PublicMealsController if needed) ─────────────

public sealed record AddVariantRequest(
    string Name,
    decimal Price,
    string Currency);

public sealed record CreateMealRequest(
    string Name,
    string? Description,
    DishType DishType,
    string? CuisineType);

public sealed record UpdateMealRequest(
    string Name,
    string? Description,
    DishType DishType,
    string? CuisineType);

public sealed record SetAvailabilityRequest(bool IsAvailable);

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
