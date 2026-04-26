using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Abstractions.Storage;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.UploadChefDocument;

public enum ChefDocumentType
{
    PersonalId = 0,
    HealthCertificate = 1
}

public sealed record UploadChefDocumentCommand(
    ChefDocumentType DocumentType,
    string FileName,
    string ContentType,
    Stream DocumentStream) : ICommand<string>;

internal sealed class UploadChefDocumentCommandHandler(
    IApplicationDbContext dbContext,
    IDocumentStorageService documentStorage,
    IUserContext userContext) : ICommandHandler<UploadChefDocumentCommand, string>
{
    public async Task<Result<string>> Handle(
        UploadChefDocumentCommand command,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userContext.UserId, cancellationToken);

        if (user is null)
            return Result.Failure<string>(UserErrors.NotFound(userContext.UserId));

        if (user.ChefProfile is null)
            return Result.Failure<string>(UserErrors.ChefProfileNotFound);

        // Delete the old document of the same type if it exists
        string? existingKey = command.DocumentType == ChefDocumentType.HealthCertificate
            ? user.ChefProfile.HealthCertificateReference
            : user.ChefProfile.PersonalIdReference;

        if (existingKey is not null)
        {
            await documentStorage.DeleteAsync(
                StorageBuckets.ChefDocuments,
                existingKey,
                cancellationToken);
        }

        // Read the stream into bytes — no processing, documents uploaded as-is
        using var ms = new MemoryStream();
        await command.DocumentStream.CopyToAsync(ms, cancellationToken);
        byte[] data = ms.ToArray();

        // Object key: {userId}/{documentType}/{guid}.{ext}
        string extension = Path.GetExtension(command.FileName).TrimStart('.').ToLowerInvariant();
        string objectKey = $"{userContext.UserId}/{command.DocumentType.ToString().ToLowerInvariant()}/{Guid.NewGuid()}.{extension}";

        string storedKey = await documentStorage.UploadAsync(
            StorageBuckets.ChefDocuments,
            objectKey,
            data,
            command.ContentType,
            cancellationToken);

        // Update the reference on ChefProfile — stored key, never a URL
        Result result = command.DocumentType == ChefDocumentType.HealthCertificate
            ? user.UpdateHealthCertificateReference(storedKey)
            : user.UpdatePersonalIdReference(storedKey);

        if (result.IsFailure)
            return Result.Failure<string>(result.Error);

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(storedKey);
    }
}

internal sealed class UploadChefDocumentCommandValidator
    : AbstractValidator<UploadChefDocumentCommand>
{
    private static readonly string[] AllowedContentTypes =
        ["application/pdf", "image/jpeg", "image/png"];

    public UploadChefDocumentCommandValidator()
    {
        RuleFor(x => x.DocumentType).IsInEnum();

        RuleFor(x => x.ContentType)
            .NotEmpty()
            .Must(ct => AllowedContentTypes.Contains(ct))
            .WithMessage("Documents must be PDF, JPEG, or PNG.");

        RuleFor(x => x.DocumentStream)
            .NotNull()
            .Must(s => s.Length <= 10 * 1024 * 1024)
            .WithMessage("Document must be 10 MB or smaller.");
    }
}
