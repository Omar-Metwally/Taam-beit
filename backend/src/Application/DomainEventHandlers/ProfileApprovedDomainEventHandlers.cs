using Application.Abstractions.Notifications;
using Domain.Users;
using Microsoft.Extensions.Logging;
using SharedKernel;

namespace Application.DomainEventHandlers;

/// <summary>
/// Notifies a user that their chef application was approved.
/// Could be extended to send an email via an IEmailService abstraction.
/// </summary>
internal sealed class UserChefProfileApprovedDomainEventHandler(
    IOrderNotificationService notificationService,
    ILogger<UserChefProfileApprovedDomainEventHandler> logger)
    : IDomainEventHandler<UserChefProfileApprovedDomainEvent>
{
    public async Task Handle(
        UserChefProfileApprovedDomainEvent domainEvent,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Chef profile approved for user {UserId} by supervisor {SupervisorId}",
            domainEvent.UserId,
            domainEvent.SupervisorUserId);

        // Notify the user via SignalR that their chef profile is now active
        await notificationService.NotifyCustomerOrderStatusAsync(
            domainEvent.UserId,
            Guid.Empty,
            "ChefProfileApproved",
            cancellationToken);
    }
}

/// <summary>
/// Notifies a user that their delivery man application was approved.
/// </summary>
internal sealed class UserDeliveryManProfileApprovedDomainEventHandler(
    IOrderNotificationService notificationService,
    ILogger<UserDeliveryManProfileApprovedDomainEventHandler> logger)
    : IDomainEventHandler<UserDeliveryManProfileApprovedDomainEvent>
{
    public async Task Handle(
        UserDeliveryManProfileApprovedDomainEvent domainEvent,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Delivery man profile approved for user {UserId} by supervisor {SupervisorId}",
            domainEvent.UserId,
            domainEvent.SupervisorUserId);

        await notificationService.NotifyCustomerOrderStatusAsync(
            domainEvent.UserId,
            Guid.Empty,
            "DeliveryManProfileApproved",
            cancellationToken);
    }
}
