using Application.Abstractions.Data;
using Application.Abstractions.Notifications;
using Domain.Deliveries;
using Domain.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SharedKernel;

namespace Application.DomainEventHandlers;

// ── DeliveryPickedUp ──────────────────────────────────────────────────────────
// Notify the customer the delivery man has collected their order.

internal sealed class DeliveryPickedUpDomainEventHandler(
    IApplicationDbContext dbContext,
    IOrderNotificationService notificationService,
    ILogger<DeliveryPickedUpDomainEventHandler> logger)
    : IDomainEventHandler<DeliveryPickedUpDomainEvent>
{
    public async Task Handle(
        DeliveryPickedUpDomainEvent domainEvent,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Delivery {DeliveryId} picked up — notifying customer for order {OrderId}",
            domainEvent.DeliveryTrackingId, domainEvent.OrderId);

        var order = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == domainEvent.OrderId, cancellationToken);

        if (order is null) return;

        await notificationService.NotifyCustomerOrderStatusAsync(
            order.CustomerId,
            order.Id,
            "PickedUp",
            cancellationToken);
    }
}

// ── DeliveryCompleted ─────────────────────────────────────────────────────────
// Mirror the completion on the Order aggregate, then notify the customer.

internal sealed class DeliveryCompletedDomainEventHandler(
    IApplicationDbContext dbContext,
    IOrderNotificationService notificationService,
    IDateTimeProvider dateTimeProvider,
    ILogger<DeliveryCompletedDomainEventHandler> logger)
    : IDomainEventHandler<DeliveryCompletedDomainEvent>
{
    public async Task Handle(
        DeliveryCompletedDomainEvent domainEvent,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Delivery {DeliveryId} completed — updating order {OrderId}",
            domainEvent.DeliveryTrackingId, domainEvent.OrderId);

        var order = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == domainEvent.OrderId, cancellationToken);

        if (order is null) return;

        // Mirror the delivered state on the Order aggregate
        order.MarkDelivered(dateTimeProvider.UtcNow);
        await dbContext.SaveChangesAsync(cancellationToken);

        // The OrderDeliveredDomainEvent raised above will be picked up by
        // OrderDeliveredDomainEventHandler on the next outbox poll,
        // which sends the final customer notification.
    }
}
