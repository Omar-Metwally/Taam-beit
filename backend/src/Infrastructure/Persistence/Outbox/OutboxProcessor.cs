using Infrastructure.Persistence;
using Infrastructure.Persistence.Outbox;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Quartz;
using SharedKernel;

namespace Infrastructure.Persistence.Outbox;

/// <summary>
/// Quartz job that runs every 5 seconds, picks up unprocessed outbox messages,
/// deserialises each domain event, resolves the correct IDomainEventHandler,
/// and dispatches it. Marks each message as processed (or failed) atomically.
///
/// At-least-once delivery: if the process crashes mid-batch, unprocessed
/// messages are re-picked on the next run. Handlers must be idempotent.
/// </summary>
[DisallowConcurrentExecution]
internal sealed class OutboxProcessor(
    IServiceScopeFactory scopeFactory,
    ILogger<OutboxProcessor> logger) : IJob
{
    private const int BatchSize = 20;

    public async Task Execute(IJobExecutionContext context)
    {
        await using var scope = scopeFactory.CreateAsyncScope();

        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var messages = await dbContext.OutboxMessages
            .Where(m => m.ProcessedAt == null)
            .OrderBy(m => m.CreatedAt)
            .Take(BatchSize)
            .ToListAsync(context.CancellationToken);

        if (messages.Count == 0)
            return;

        logger.LogInformation("Processing {Count} outbox messages", messages.Count);

        foreach (var message in messages)
        {
            await ProcessMessageAsync(message, scope.ServiceProvider, context.CancellationToken);
        }

        await dbContext.SaveChangesAsync(context.CancellationToken);
    }

    private async Task ProcessMessageAsync(
        OutboxMessage message,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        try
        {
            Type? eventType = Type.GetType(message.Type);
            if (eventType is null)
            {
                logger.LogError(
                    "Cannot resolve type {Type} for outbox message {Id}",
                    message.Type,
                    message.Id);

                message.ProcessedAt = DateTime.UtcNow;
                message.Error = $"Cannot resolve type: {message.Type}";
                return;
            }

            var domainEvent = JsonConvert.DeserializeObject(message.Payload, eventType,
                new JsonSerializerSettings { TypeNameHandling = TypeNameHandling.All });

            if (domainEvent is null)
            {
                message.ProcessedAt = DateTime.UtcNow;
                message.Error = "Deserialisation returned null";
                return;
            }

            // Resolve IDomainEventHandler<TEvent> for this event type
            Type handlerType = typeof(IDomainEventHandler<>).MakeGenericType(eventType);
            var handlers = services.GetServices(handlerType);

            foreach (var handler in handlers)
            {
                if (handler is null) continue;

                // Invoke Handle(domainEvent, cancellationToken) via reflection
                var method = handlerType.GetMethod(nameof(IDomainEventHandler<IDomainEvent>.Handle))!;
                var task = (Task)method.Invoke(handler, [domainEvent, cancellationToken])!;
                await task;
            }

            message.ProcessedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Error processing outbox message {Id} of type {Type}",
                message.Id,
                message.Type);

            message.Error = ex.Message;
            // Do NOT set ProcessedAt — message will be retried on next poll
        }
    }
}
