using Application.Abstractions.Storage;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;

namespace Infrastructure.Storage;

/// <summary>
/// Handles PUBLIC assets — meal images and chef avatars.
/// Buckets created here get public read policy so URLs are directly accessible
/// by browsers and mobile apps with no authentication.
/// </summary>
internal sealed class MinioFileStorageService(
    IMinioClient minioClient,
    IOptions<MinioSettings> settings,
    ILogger<MinioFileStorageService> logger) : IFileStorageService
{
    private readonly MinioSettings _settings = settings.Value;

    public async Task<string> UploadAsync(
        string bucketName,
        string objectKey,
        byte[] data,
        string contentType = "image/webp",
        CancellationToken cancellationToken = default)
    {
        await EnsurePublicBucketExistsAsync(bucketName, cancellationToken);

        using var stream = new MemoryStream(data);

        var putArgs = new PutObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectKey)
            .WithStreamData(stream)
            .WithObjectSize(data.Length)
            .WithContentType(contentType);

        await minioClient.PutObjectAsync(putArgs, cancellationToken);

        logger.LogInformation(
            "Uploaded public asset {Key} to bucket {Bucket} ({Bytes} bytes)",
            objectKey, bucketName, data.Length);

        return $"{_settings.PublicBaseUrl.TrimEnd('/')}/{bucketName}/{objectKey}";
    }

    public async Task DeleteByPrefixAsync(
        string bucketName,
        string prefix,
        CancellationToken cancellationToken = default)
    {
        // List all objects with this prefix (e.g. all size variants of one image)
        var objectNames = new List<string>();

        var listArgs = new ListObjectsArgs()
            .WithBucket(bucketName)
            .WithPrefix(prefix)
            .WithRecursive(false);

        var tcs = new TaskCompletionSource<bool>();

        var observable = minioClient.ListObjectsAsync(listArgs, cancellationToken);
        observable.Subscribe(
            item => objectNames.Add(item.Key),
            ex => tcs.SetException(ex),
            () => tcs.SetResult(true));

        await tcs.Task;

        if (objectNames.Count == 0) return;

        var removeArgs = new RemoveObjectsArgs()
            .WithBucket(bucketName)
            .WithObjects(objectNames);

        await minioClient.RemoveObjectsAsync(removeArgs, cancellationToken);

        logger.LogInformation(
            "Deleted {Count} objects with prefix {Prefix} from bucket {Bucket}",
            objectNames.Count, prefix, bucketName);
    }

    private async Task EnsurePublicBucketExistsAsync(string bucketName, CancellationToken ct)
    {
        var existsArgs = new BucketExistsArgs().WithBucket(bucketName);
        if (await minioClient.BucketExistsAsync(existsArgs, ct)) return;

        await minioClient.MakeBucketAsync(new MakeBucketArgs().WithBucket(bucketName), ct);

        // Public read — no auth needed to fetch images
        string policy = $$"""
            {
              "Version": "2012-10-17",
              "Statement": [{
                "Effect":    "Allow",
                "Principal": {"AWS": ["*"]},
                "Action":    ["s3:GetObject"],
                "Resource":  ["arn:aws:s3:::{{bucketName}}/*"]
              }]
            }
            """;

        await minioClient.SetPolicyAsync(
            new SetPolicyArgs().WithBucket(bucketName).WithPolicy(policy), ct);

        logger.LogInformation("Created public bucket {Bucket}", bucketName);
    }
}
