using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Abstractions.Storage;
using Application.Users.UploadChefDocument;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.GetChefDocumentUrl;

public sealed record GetChefDocumentUrlQuery(
    Guid TargetUserId,
    ChefDocumentType DocumentType) : IQuery<string>;

internal sealed class GetChefDocumentUrlQueryHandler(
    IApplicationDbContext dbContext,
    IDocumentStorageService documentStorage)
    : IQueryHandler<GetChefDocumentUrlQuery, string>
{
    /// <summary>Presigned URL is valid for 15 minutes — enough for a supervisor to review.</summary>
    private static readonly TimeSpan PresignedUrlExpiry = TimeSpan.FromMinutes(15);

    public async Task<Result<string>> Handle(
        GetChefDocumentUrlQuery query,
        CancellationToken cancellationToken)
    {
        User? user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == query.TargetUserId, cancellationToken);

        if (user is null)
            return Result.Failure<string>(UserErrors.NotFound(query.TargetUserId));

        if (user.ChefProfile is null)
            return Result.Failure<string>(UserErrors.ChefProfileNotFound);

        string? objectKey = query.DocumentType == ChefDocumentType.HealthCertificate
            ? user.ChefProfile.HealthCertificateReference
            : user.ChefProfile.PersonalIdReference;

        if (objectKey is null)
            return Result.Failure<string>(UserErrors.DocumentNotUploaded(query.DocumentType.ToString()));

        // Generate a time-limited presigned URL — the document stays private in MinIO
        // The supervisor's browser fetches it directly; the URL expires in 15 minutes
        string presignedUrl = await documentStorage.GetPresignedUrlAsync(
            StorageBuckets.ChefDocuments,
            objectKey,
            PresignedUrlExpiry,
            cancellationToken);

        return Result.Success(presignedUrl);
    }
}

internal sealed class GetChefDocumentUrlQueryValidator
    : AbstractValidator<GetChefDocumentUrlQuery>
{
    public GetChefDocumentUrlQueryValidator()
    {
        RuleFor(x => x.TargetUserId).NotEmpty();
        RuleFor(x => x.DocumentType).IsInEnum();
    }
}
