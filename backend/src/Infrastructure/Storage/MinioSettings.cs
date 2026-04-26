namespace Infrastructure.Storage;

public sealed class MinioSettings
{
    public const string SectionName = "Minio";

    public string Endpoint { get; init; } = string.Empty;
    public string AccessKey { get; init; } = string.Empty;
    public string SecretKey { get; init; } = string.Empty;

    /// <summary>Base public URL for generating object URLs (may differ from internal endpoint).</summary>
    public string PublicBaseUrl { get; init; } = string.Empty;

    public bool UseSSL { get; init; } = false;
}
