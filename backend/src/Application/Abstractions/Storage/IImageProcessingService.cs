namespace Application.Abstractions.Storage;

/// <summary>
/// Processes raw image uploads before they reach object storage.
/// Implemented by NetVipsImageProcessingService in Infrastructure.
/// Application layer only sees this interface — no native library dependencies.
/// </summary>
public interface IImageProcessingService
{
    /// <summary>
    /// Processes a raw image stream into multiple size variants:
    ///   - Small  (thumbnail)
    ///   - Medium (card view)
    ///   - Large  (detail / hero)
    ///
    /// For each variant:
    ///   1. Strips all EXIF metadata (GPS, device info, timestamps)
    ///   2. Auto-rotates based on EXIF orientation before stripping
    ///   3. Resizes to fit within the target dimensions (preserving aspect ratio)
    ///   4. Encodes as WebP at 80% quality
    ///
    /// Returns a list of <see cref="ProcessedImageVariant"/> ready for upload.
    /// </summary>
    Task<IReadOnlyList<ProcessedImageVariant>> ProcessMealImageAsync(
        Stream inputStream,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Processes a chef avatar:
    ///   - Single square crop (400×400) — profile picture usage
    ///   - Small square (80×80)  — listing / comment usage
    /// EXIF stripped, output WebP.
    /// </summary>
    Task<IReadOnlyList<ProcessedImageVariant>> ProcessAvatarAsync(
        Stream inputStream,
        CancellationToken cancellationToken = default);
}

/// <summary>One processed size variant, ready to be uploaded to object storage.</summary>
public sealed record ProcessedImageVariant(
    /// <summary>Size label appended to the object key: "sm", "md", "lg".</summary>
    string Suffix,
    /// <summary>WebP-encoded image bytes.</summary>
    byte[] Data,
    /// <summary>Always "image/webp".</summary>
    string ContentType = "image/webp");
