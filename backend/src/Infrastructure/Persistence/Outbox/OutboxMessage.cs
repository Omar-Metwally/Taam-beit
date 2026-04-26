namespace Infrastructure.Persistence.Outbox;

/// <summary>
/// Represents a domain event serialised into the outbox table.
/// Written in the same transaction as the aggregate change so the event
/// can never be lost even if the process crashes before dispatching.
/// </summary>
public sealed class OutboxMessage
{
    public Guid Id { get; init; } = Guid.NewGuid();

    /// <summary>Assembly-qualified type name used to deserialise the payload.</summary>
    public string Type { get; init; } = string.Empty;

    /// <summary>JSON-serialised domain event payload.</summary>
    public string Payload { get; init; } = string.Empty;

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    /// <summary>Set when the event has been successfully processed.</summary>
    public DateTime? ProcessedAt { get; set; }

    /// <summary>Last error message if processing failed. Null on success.</summary>
    public string? Error { get; set; }
}
