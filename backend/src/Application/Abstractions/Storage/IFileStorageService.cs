namespace Application.Abstractions.Storage;

/// <summary>
/// Handles PUBLIC assets — meal images and chef avatars.
/// Files in these buckets are accessible via permanent public URLs.
/// No authentication required to read them.
/// </summary>
public interface IFileStorageService
{
    /// <summary>
    /// Uploads pre-processed image bytes to the specified public bucket.
    /// Returns the permanent public URL.
    /// </summary>
    Task<string> UploadAsync(
        string bucketName,
        string objectKey,
        byte[] data,
        string contentType = "image/webp",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes all objects whose key starts with the given prefix.
    /// Used to clean up all size variants of a meal image atomically.
    /// e.g. prefix = "{mealId}/{guid}" deletes -sm.webp, -md.webp, -lg.webp
    /// </summary>
    Task DeleteByPrefixAsync(
        string bucketName,
        string prefix,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Handles PRIVATE documents — health certificates, personal ID scans.
/// Files in these buckets have no public policy.
/// Access is granted only via time-limited presigned URLs generated on demand.
/// </summary>
public interface IDocumentStorageService
{
    /// <summary>
    /// Uploads a private document (raw bytes, no processing).
    /// Returns only the object key — never a URL.
    /// The key is stored in the database; the URL is generated on request.
    /// </summary>
    Task<string> UploadAsync(
        string bucketName,
        string objectKey,
        byte[] data,
        string contentType,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates a presigned URL granting temporary read access to the document.
    /// The URL expires after the specified duration.
    /// Called only when a supervisor requests to review an application.
    /// </summary>
    Task<string> GetPresignedUrlAsync(
        string bucketName,
        string objectKey,
        TimeSpan expiry,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Permanently deletes a document.
    /// </summary>
    Task DeleteAsync(
        string bucketName,
        string objectKey,
        CancellationToken cancellationToken = default);
}

/// <summary>Centralised bucket name constants — no magic strings.</summary>
public static class StorageBuckets
{
    // Public — permanent URLs, no auth required
    public const string MealImages  = "meal-images";
    public const string ChefAvatars = "chef-avatars";

    // Private — presigned URLs only, time-limited access
    public const string ChefDocuments = "chef-documents";
}
