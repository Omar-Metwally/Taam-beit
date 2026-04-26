using Application.Abstractions.Data;
using Application.Abstractions.Geospatial;
using Application.Abstractions.Notifications;
using Domain.Deliveries;
using Domain.Orders;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SharedKernel;

namespace Application.DomainEventHandlers;

// ── OrderPlaced ───────────────────────────────────────────────────────────────
// Notify the chef that a new order is waiting for confirmation.

internal sealed class OrderPlacedDomainEventHandler(
    IOrderNotificationService notificationService,
    ILogger<OrderPlacedDomainEventHandler> logger)
    : IDomainEventHandler<OrderPlacedDomainEvent>
{
    public async Task Handle(
        OrderPlacedDomainEvent domainEvent,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Order {OrderId} placed — notifying chef {ChefId}",
            domainEvent.OrderId, domainEvent.ChefId);

        await notificationService.NotifyChefNewOrderAsync(
            domainEvent.ChefId,
            domainEvent.OrderId,
            cancellationToken);
    }
}

// ── OrderConfirmed ────────────────────────────────────────────────────────────
// Notify the customer that the chef accepted their order.

internal sealed class OrderConfirmedDomainEventHandler(
    IOrderNotificationService notificationService,
    ILogger<OrderConfirmedDomainEventHandler> logger)
    : IDomainEventHandler<OrderConfirmedDomainEvent>
{
    public async Task Handle(
        OrderConfirmedDomainEvent domainEvent,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Order {OrderId} confirmed — notifying customer {CustomerId}",
            domainEvent.OrderId, domainEvent.CustomerId);

        await notificationService.NotifyCustomerOrderStatusAsync(
            domainEvent.CustomerId,
            domainEvent.OrderId,
            nameof(OrderStatus.Confirmed),
            cancellationToken);
    }
}

// ── OrderRejected ─────────────────────────────────────────────────────────────
// Notify the customer that the chef declined their order.

internal sealed class OrderRejectedDomainEventHandler(
    IOrderNotificationService notificationService,
    ILogger<OrderRejectedDomainEventHandler> logger)
    : IDomainEventHandler<OrderRejectedDomainEvent>
{
    public async Task Handle(
        OrderRejectedDomainEvent domainEvent,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Order {OrderId} rejected — notifying customer {CustomerId}",
            domainEvent.OrderId, domainEvent.CustomerId);

        await notificationService.NotifyCustomerOrderStatusAsync(
            domainEvent.CustomerId,
            domainEvent.OrderId,
            nameof(OrderStatus.Rejected),
            cancellationToken);
    }
}

// ── OrderPreparing ────────────────────────────────────────────────────────────
// Notify the customer that the chef has started cooking.

internal sealed class OrderPreparingDomainEventHandler(
    IOrderNotificationService notificationService,
    ILogger<OrderPreparingDomainEventHandler> logger)
    : IDomainEventHandler<OrderPreparingDomainEvent>
{
    public async Task Handle(
        OrderPreparingDomainEvent domainEvent,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Order {OrderId} is being prepared — notifying customer {CustomerId}",
            domainEvent.OrderId, domainEvent.CustomerId);

        await notificationService.NotifyCustomerOrderStatusAsync(
            domainEvent.CustomerId,
            domainEvent.OrderId,
            nameof(OrderStatus.Preparing),
            cancellationToken);
    }
}

// ── OrderReadyForPickup ───────────────────────────────────────────────────────
// 1. Notify the customer their order is ready.
// 2. H3 proximity lookup → fan-out to nearby delivery men.
// Both notifications are guaranteed by the outbox — neither can be lost.

internal sealed class OrderReadyForPickupDomainEventHandler(
    IDeliveryPositionCache positionCache,
    IH3Service h3Service,
    IApplicationDbContext dbContext,
    IOrderNotificationService notificationService,
    ILogger<OrderReadyForPickupDomainEventHandler> logger)
    : IDomainEventHandler<OrderReadyForPickupDomainEvent>
{
    private const int RingSize = 2; // H3 resolution 9, k=2 → ~1-2 km radius

    public async Task Handle(
        OrderReadyForPickupDomainEvent domainEvent,
        CancellationToken cancellationToken)
    {
        // Step 1: Notify customer
        await notificationService.NotifyCustomerOrderStatusAsync(
            domainEvent.CustomerId,
            domainEvent.OrderId,
            nameof(OrderStatus.ReadyForPickup),
            cancellationToken);

        logger.LogInformation(
            "Order {OrderId} ready for pickup — broadcasting to nearby delivery men",
            domainEvent.OrderId);

        // Step 2: H3 proximity lookup — integer cell lookup, no spatial math
        IReadOnlyList<Guid> nearbyDriverIds = await positionCache.GetNearbyDriverIdsAsync(
            domainEvent.ChefLocation.Latitude,
            domainEvent.ChefLocation.Longitude,
            RingSize,
            cancellationToken);

        if (nearbyDriverIds.Count == 0)
        {
            logger.LogWarning(
                "No nearby delivery men found for order {OrderId}", domainEvent.OrderId);
            return;
        }

        // Step 3: Filter to approved delivery men (cache may have stale entries)
        var approvedDriverIds = await dbContext.Users
            .Where(u => nearbyDriverIds.Contains(u.Id)
                     && u.DeliveryManProfile != null
                     && u.DeliveryManProfile.Status == ProfileStatus.Approved)
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);

        if (approvedDriverIds.Count == 0)
        {
            logger.LogWarning(
                "No approved delivery men available for order {OrderId}", domainEvent.OrderId);
            return;
        }

        // Step 4: Fan-out via SignalR
        await notificationService.NotifyNearbyDeliveryMenAsync(
            approvedDriverIds,
            domainEvent.OrderId,
            domainEvent.ChefId,
            cancellationToken);

        logger.LogInformation(
            "Notified {Count} delivery men about order {OrderId}",
            approvedDriverIds.Count, domainEvent.OrderId);
    }
}

// ── OrderAssignedToDeliveryMan ────────────────────────────────────────────────
// 1. Create the DeliveryTracking aggregate.
// 2. Notify the customer that their order is on its way.

internal sealed class OrderAssignedToDeliveryManDomainEventHandler(
    IApplicationDbContext dbContext,
    IOrderNotificationService notificationService,
    IDateTimeProvider dateTimeProvider,
    ILogger<OrderAssignedToDeliveryManDomainEventHandler> logger)
    : IDomainEventHandler<OrderAssignedToDeliveryManDomainEvent>
{
    public async Task Handle(
        OrderAssignedToDeliveryManDomainEvent domainEvent,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Order {OrderId} assigned to delivery man {DeliveryManId}",
            domainEvent.OrderId, domainEvent.DeliveryManId);

        // Load chef's operation location for the pickup snapshot
        var chef = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == domainEvent.ChefId, cancellationToken);

        var order = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == domainEvent.OrderId, cancellationToken);

        if (chef?.ChefProfile is not null && order is not null)
        {
            var tracking = DeliveryTracking.Create(
                domainEvent.OrderId,
                domainEvent.DeliveryManId,
                chef.ChefProfile.OperationLocation,
                order.DeliveryLocation,
                dateTimeProvider.UtcNow);

            dbContext.DeliveryTrackings.Add(tracking);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        // Notify customer their order is out for delivery
        await notificationService.NotifyCustomerOrderStatusAsync(
            domainEvent.CustomerId,
            domainEvent.OrderId,
            nameof(OrderStatus.OutForDelivery),
            cancellationToken);
    }
}

// ── OrderCancelled ────────────────────────────────────────────────────────────
// Notify the chef that the customer cancelled.

internal sealed class OrderCancelledDomainEventHandler(
    IOrderNotificationService notificationService,
    ILogger<OrderCancelledDomainEventHandler> logger)
    : IDomainEventHandler<OrderCancelledDomainEvent>
{
    public async Task Handle(
        OrderCancelledDomainEvent domainEvent,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Order {OrderId} cancelled — notifying chef {ChefId}",
            domainEvent.OrderId, domainEvent.ChefId);

        await notificationService.NotifyChefNewOrderAsync(
            domainEvent.ChefId,
            domainEvent.OrderId,
            cancellationToken);
    }
}

// ── OrderDelivered ────────────────────────────────────────────────────────────
// Notify the customer their order has been delivered.

internal sealed class OrderDeliveredDomainEventHandler(
    IOrderNotificationService notificationService,
    ILogger<OrderDeliveredDomainEventHandler> logger)
    : IDomainEventHandler<OrderDeliveredDomainEvent>
{
    public async Task Handle(
        OrderDeliveredDomainEvent domainEvent,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Order {OrderId} delivered — notifying customer {CustomerId}",
            domainEvent.OrderId, domainEvent.CustomerId);

        await notificationService.NotifyCustomerOrderStatusAsync(
            domainEvent.CustomerId,
            domainEvent.OrderId,
            nameof(OrderStatus.Delivered),
            cancellationToken);
    }
}
