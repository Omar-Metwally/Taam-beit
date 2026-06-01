using SharedKernel;

namespace Application.Abstractions.Messaging;

/// <summary>
/// Writes domain events to the outbox table within the current transaction.
/// The OutboxProcessor background service (Infrastructure) picks them up
/// and dispatches to the registered IDomainEventHandler implementations.
/// This guarantees at-least-once delivery even if the process crashes
/// between SaveChanges and the event dispatch.
/// </summary>
public interface IOutboxPublisher
{
    Task PublishAsync(IDomainEvent domainEvent, CancellationToken cancellationToken = default);
}
