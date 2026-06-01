using Amazon.S3;
using Amazon.S3.Model;
using Application.Abstractions.Storage;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.Storage;

/// <summary>
/// Handles PUBLIC assets — meal images and chef avatars.
/// Buckets must already exist and have public-read access granted via the
/// Garage CLI (bootstrap-garage.sh). No bucket-policy logic lives here.
/// </summary>
internal sealed class GarageFileStorageService(
    IAmazonS3 s3Client,
    IOptions<GarageSettings> settings,
    ILogger<GarageFileStorageService> logger) : IFileStorageService
{
    private readonly GarageSettings _settings = settings.Value;

    public async Task<string> UploadAsync(
        string bucketName,
        string objectKey,
        byte[] data,
        string contentType = "image/webp",
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
            "Uploaded public asset {Key} to bucket {Bucket} ({Bytes} bytes)",
            objectKey, bucketName, data.Length);

        return $"http://{bucketName}.localhost:3903/{objectKey}";

        //return $"{_settings.PublicBaseUrl.TrimEnd('/')}/{bucketName}/{objectKey}";
    }

    public async Task DeleteByPrefixAsync(
        string bucketName,
        string prefix,
        CancellationToken cancellationToken = default)
    {
        // List all objects with this prefix (e.g. all size variants of one image)
        var listRequest = new ListObjectsV2Request
        {
            BucketName = bucketName,
            Prefix = prefix,
        };

        var listResponse = await s3Client.ListObjectsV2Async(listRequest, cancellationToken);

        if (listResponse.S3Objects.Count == 0) return;

        var deleteRequest = new DeleteObjectsRequest
        {
            BucketName = bucketName,
            Objects = listResponse.S3Objects
                .Select(o => new KeyVersion { Key = o.Key })
                .ToList(),
        };

        await s3Client.DeleteObjectsAsync(deleteRequest, cancellationToken);

        logger.LogInformation(
            "Deleted {Count} objects with prefix {Prefix} from bucket {Bucket}",
            listResponse.S3Objects.Count, prefix, bucketName);
    }
}
