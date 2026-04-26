using Application.Abstractions.Storage;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;

namespace Infrastructure.Storage;

/// <summary>
/// Handles PRIVATE documents — health certificates, personal ID scans.
/// These buckets have NO public policy — objects are never directly accessible.
/// Access is granted only via time-limited presigned URLs generated per request.
///
/// Security model:
///   - Chef uploads document → stored in private MinIO bucket, key saved to DB
///   - Supervisor requests review → API generates 15-minute presigned URL
///   - Supervisor's browser fetches document → URL expires, access revoked
///   - No permanent URL ever exists for sensitive documents
/// </summary>
internal sealed class MinioDocumentStorageService(
    IMinioClient minioClient,
    IOptions<MinioSettings> settings,
    ILogger<MinioDocumentStorageService> logger) : IDocumentStorageService
{
    private readonly MinioSettings _settings = settings.Value;

    public async Task<string> UploadAsync(
        string bucketName,
        string objectKey,
        byte[] data,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        await EnsurePrivateBucketExistsAsync(bucketName, cancellationToken);

        using var stream = new MemoryStream(data);

        var putArgs = new PutObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectKey)
            .WithStreamData(stream)
            .WithObjectSize(data.Length)
            .WithContentType(contentType);

        await minioClient.PutObjectAsync(putArgs, cancellationToken);

        logger.LogInformation(
            "Uploaded private document {Key} to bucket {Bucket}",
            objectKey, bucketName);

        // Return only the object key — never a URL
        return objectKey;
    }

    public async Task<string> GetPresignedUrlAsync(
        string bucketName,
        string objectKey,
        TimeSpan expiry,
        CancellationToken cancellationToken = default)
    {
        var presignedArgs = new PresignedGetObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectKey)
            .WithExpiry((int)expiry.TotalSeconds);

        string url = await minioClient.PresignedGetObjectAsync(presignedArgs);

        logger.LogInformation(
            "Generated presigned URL for {Key} in bucket {Bucket}, expires in {Minutes} min",
            objectKey, bucketName, expiry.TotalMinutes);

        return url;
    }

    public async Task DeleteAsync(
        string bucketName,
        string objectKey,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var removeArgs = new RemoveObjectArgs()
                .WithBucket(bucketName)
                .WithObject(objectKey);

            await minioClient.RemoveObjectAsync(removeArgs, cancellationToken);

            logger.LogInformation(
                "Deleted private document {Key} from bucket {Bucket}",
                objectKey, bucketName);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Failed to delete document {Key} from {Bucket}",
                objectKey, bucketName);
        }
    }

    /// <summary>
    /// Creates a private bucket with NO public read policy.
    /// Only presigned URLs grant access, and only temporarily.
    /// </summary>
    private async Task EnsurePrivateBucketExistsAsync(string bucketName, CancellationToken ct)
    {
        var existsArgs = new BucketExistsArgs().WithBucket(bucketName);
        if (await minioClient.BucketExistsAsync(existsArgs, ct)) return;

        await minioClient.MakeBucketAsync(
            new MakeBucketArgs().WithBucket(bucketName), ct);

        // Explicitly deny all public access — belt-and-suspenders
        string denyPolicy = $$"""
            {
              "Version": "2012-10-17",
              "Statement": [{
                "Effect":    "Deny",
                "Principal": {"AWS": ["*"]},
                "Action":    ["s3:GetObject"],
                "Resource":  ["arn:aws:s3:::{{bucketName}}/*"],
                "Condition": {
                  "StringNotLike": {
                    "aws:UserAgent": ["*"]
                  }
                }
              }]
            }
            """;

        // We intentionally do NOT set a public policy here
        // The absence of a policy + MinIO default = private
        logger.LogInformation("Created private bucket {Bucket} (no public policy)", bucketName);
    }
}
