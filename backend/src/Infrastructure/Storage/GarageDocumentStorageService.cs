using Amazon.S3;
using Amazon.S3.Model;
using Application.Abstractions.Storage;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Storage;

/// <summary>
/// Handles PRIVATE documents — health certificates, personal ID scans.
/// Buckets have no public access. Access is granted only via time-limited
/// presigned URLs generated per supervisor request.
///
/// Security model:
///   - Chef uploads document → stored in private Garage bucket, key saved to DB
///   - Supervisor requests review → API generates 15-minute presigned URL
///   - Supervisor's browser fetches document → URL expires, access revoked
///   - No permanent URL ever exists for sensitive documents
/// </summary>
internal sealed class GarageDocumentStorageService(
    IAmazonS3 s3Client,
    ILogger<GarageDocumentStorageService> logger) : IDocumentStorageService
{
    public async Task<string> UploadAsync(
        string bucketName,
        string objectKey,
        byte[] data,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        using var stream = new MemoryStream(data);

        var request = new PutObjectRequest
        {
            BucketName = bucketName,
            Key = objectKey,
            InputStream = stream,
            ContentType = contentType,
        };

        await s3Client.PutObjectAsync(request, cancellationToken);

        logger.LogInformation(
            "Uploaded private document {Key} to bucket {Bucket}",
            objectKey, bucketName);

        // Return only the object key — never a URL
        return objectKey;
    }

    public Task<string> GetPresignedUrlAsync(
        string bucketName,
        string objectKey,
        TimeSpan expiry,
        CancellationToken cancellationToken = default)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = bucketName,
            Key = objectKey,
            Expires = DateTime.UtcNow.Add(expiry),
            Verb = HttpVerb.GET,
        };

        // GetPreSignedURL is synchronous in the AWS SDK — no await needed
        string url = s3Client.GetPreSignedURL(request);

        logger.LogInformation(
            "Generated presigned URL for {Key} in bucket {Bucket}, expires in {Minutes} min",
            objectKey, bucketName, expiry.TotalMinutes);

        return Task.FromResult(url);
    }

    public async Task DeleteAsync(
        string bucketName,
        string objectKey,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new DeleteObjectRequest
            {
                BucketName = bucketName,
                Key = objectKey,
            };

            await s3Client.DeleteObjectAsync(request, cancellationToken);

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
}
