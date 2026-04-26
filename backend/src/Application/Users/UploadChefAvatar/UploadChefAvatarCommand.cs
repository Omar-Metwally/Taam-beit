using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Abstractions.Storage;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.UploadChefAvatar;

public sealed record UploadChefAvatarCommand(
    string ContentType,
    Stream ImageStream) : ICommand<ChefAvatarUploadResponse>;

public sealed record ChefAvatarUploadResponse(
    string SmallUrl,   // 80×80  — listing / comment contexts
    string LargeUrl);  // 400×400 — profile page

internal sealed class UploadChefAvatarCommandHandler(
    IApplicationDbContext dbContext,
    IImageProcessingService imageProcessor,
    IFileStorageService fileStorage,
    IUserContext userContext) : ICommandHandler<UploadChefAvatarCommand, ChefAvatarUploadResponse>
{
    public async Task<Result<ChefAvatarUploadResponse>> Handle(
        UploadChefAvatarCommand command,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userContext.UserId, cancellationToken);

        if (user is null)
            return Result.Failure<ChefAvatarUploadResponse>(UserErrors.NotFound(userContext.UserId));

        if (!user.IsApprovedChef)
            return Result.Failure<ChefAvatarUploadResponse>(UserErrors.ChefProfileNotActive);

        // Delete old avatar variants if they exist
        if (user.ChefProfile!.AvatarUrl is not null)
        {
            await fileStorage.DeleteByPrefixAsync(
                StorageBuckets.ChefAvatars,
                user.ChefProfile.AvatarUrl,   // stored as base key prefix
                cancellationToken);
        }

        // Process: auto-rotate, strip EXIF, square-crop, encode as WebP
        var variants = await imageProcessor.ProcessAvatarAsync(
            command.ImageStream,
            cancellationToken);

        string baseKey = $"{userContext.UserId}/{Guid.NewGuid()}";

        string? smallUrl = null, largeUrl = null;

        foreach (var variant in variants)
        {
            string objectKey = $"{baseKey}-{variant.Suffix}.webp";

            string url = await fileStorage.UploadAsync(
                StorageBuckets.ChefAvatars,
                objectKey,
                variant.Data,
                variant.ContentType,
                cancellationToken);

            switch (variant.Suffix)
            {
                case "sm": smallUrl = url; break;
                case "lg": largeUrl = url; break;
            }
        }

        // Store the base key — client appends -sm.webp or -lg.webp
        Result result = user.SetChefAvatarUrl(baseKey);
        if (result.IsFailure)
            return Result.Failure<ChefAvatarUploadResponse>(result.Error);

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new ChefAvatarUploadResponse(smallUrl!, largeUrl!));
    }
}

internal sealed class UploadChefAvatarCommandValidator : AbstractValidator<UploadChefAvatarCommand>
{
    private static readonly string[] AllowedContentTypes =
        ["image/jpeg", "image/png", "image/webp"];

    public UploadChefAvatarCommandValidator()
    {
        RuleFor(x => x.ContentType)
            .NotEmpty()
            .Must(ct => AllowedContentTypes.Contains(ct))
            .WithMessage("Only JPEG, PNG, and WebP images are allowed.");

        RuleFor(x => x.ImageStream)
            .NotNull()
            .Must(s => s.Length <= 10 * 1024 * 1024)
            .WithMessage("Avatar must be 10 MB or smaller before processing.");
    }
}
