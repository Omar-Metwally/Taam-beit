using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Abstractions.Storage;
using Domain.Meals;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Meals.UploadMealImage;

public sealed record UploadMealImageCommand(
    Guid MealId,
    string ContentType,
    Stream ImageStream) : ICommand<MealImageUploadResponse>;

/// <summary>
/// Returns all three variant URLs so the client can store them
/// and pick the right size depending on context.
/// </summary>
public sealed record MealImageUploadResponse(
    string SmallUrl,
    string MediumUrl,
    string LargeUrl);

internal sealed class UploadMealImageCommandHandler(
    IApplicationDbContext dbContext,
    IImageProcessingService imageProcessor,
    IFileStorageService fileStorage,
    IUserContext userContext) : ICommandHandler<UploadMealImageCommand, MealImageUploadResponse>
{
    public async Task<Result<MealImageUploadResponse>> Handle(
        UploadMealImageCommand command,
        CancellationToken cancellationToken)
    {
        Meal? meal = await dbContext.Meals
            .FirstOrDefaultAsync(m => m.Id == command.MealId, cancellationToken);

        if (meal is null)
            return Result.Failure<MealImageUploadResponse>(MealErrors.NotFound(command.MealId));

        if (meal.ChefId != userContext.UserId)
            return Result.Failure<MealImageUploadResponse>(UserErrors.Unauthorized);

        // Delete old image variants if they exist
        if (meal.ImageUrl is not null)
        {
            await fileStorage.DeleteByPrefixAsync(
                StorageBuckets.MealImages,
                meal.ImageUrl,          // stored as base prefix, not a full URL
                cancellationToken);
        }

        // Process: strip EXIF, resize to 3 variants, encode as WebP
        var variants = await imageProcessor.ProcessMealImageAsync(
            command.ImageStream,
            cancellationToken);

        // Base key — variants append their suffix: {mealId}/{guid}
        string baseKey = $"{command.MealId}/{Guid.NewGuid()}";

        string? smallUrl = null, mediumUrl = null, largeUrl = null;

        foreach (var variant in variants)
        {
            string objectKey = $"{baseKey}-{variant.Suffix}.webp";

            string url = await fileStorage.UploadAsync(
                StorageBuckets.MealImages,
                objectKey,
                variant.Data,
                variant.ContentType,
                cancellationToken);

            switch (variant.Suffix)
            {
                case "sm": smallUrl  = url; break;
                case "md": mediumUrl = url; break;
                case "lg": largeUrl  = url; break;
            }
        }

        // Store the base key (not a URL) so we can reconstruct or delete all variants
        Result result = meal.SetImageUrl(baseKey);
        if (result.IsFailure)
            return Result.Failure<MealImageUploadResponse>(result.Error);

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new MealImageUploadResponse(smallUrl!, mediumUrl!, largeUrl!));
    }
}

internal sealed class UploadMealImageCommandValidator : AbstractValidator<UploadMealImageCommand>
{
    private static readonly string[] AllowedContentTypes =
        ["image/jpeg", "image/png", "image/webp"];

    public UploadMealImageCommandValidator()
    {
        RuleFor(x => x.MealId).NotEmpty();

        RuleFor(x => x.ContentType)
            .NotEmpty()
            .Must(ct => AllowedContentTypes.Contains(ct))
            .WithMessage("Only JPEG, PNG, and WebP images are allowed.");

        RuleFor(x => x.ImageStream)
            .NotNull()
            .Must(s => s.Length <= 15 * 1024 * 1024)
            .WithMessage("Image must be 15 MB or smaller before processing.");
    }
}
