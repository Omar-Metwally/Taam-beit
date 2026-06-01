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
        if (!string.IsNullOrWhiteSpace(meal.ImageKeyPrefix))
        {
            await fileStorage.DeleteByPrefixAsync(
                StorageBuckets.MealImages,
                meal.ImageKeyPrefix,
                cancellationToken);
        }

        var variants = await imageProcessor.ProcessMealImageAsync(
            command.ImageStream,
            cancellationToken);

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
                case "sm": smallUrl = url; break;
                case "md": mediumUrl = url; break;
                case "lg": largeUrl = url; break;
            }
        }

        if (smallUrl is null || mediumUrl is null || largeUrl is null)
            return Result.Failure<MealImageUploadResponse>(
                Error.Problem("ImageUpload.Incomplete", "Image processing did not produce all required variants."));

        Result result = meal.SetImage(mediumUrl, baseKey);
        if (result.IsFailure)
            return Result.Failure<MealImageUploadResponse>(result.Error);

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new MealImageUploadResponse(smallUrl, mediumUrl, largeUrl));
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
