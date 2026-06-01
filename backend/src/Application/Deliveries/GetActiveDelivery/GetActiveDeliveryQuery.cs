using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Deliveries;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Deliveries.GetActiveDelivery;

public sealed record GetActiveDeliveryQuery : IQuery<ActiveDeliveryResponse>;

public sealed record ActiveDeliveryResponse(
    Guid DeliveryTrackingId,
    Guid OrderId,
    string Status,
    double PickupLatitude,
    double PickupLongitude,
    string? PickupAddress,
    double DropoffLatitude,
    double DropoffLongitude,
    string? DropoffAddress,
    DateTime AcceptedAt,
    DateTime? PickedUpAt);

internal sealed class GetActiveDeliveryQueryHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : IQueryHandler<GetActiveDeliveryQuery, ActiveDeliveryResponse>
{
    public async Task<Result<ActiveDeliveryResponse>> Handle(
        GetActiveDeliveryQuery query,
        CancellationToken cancellationToken)
    {
        DeliveryTracking? tracking = await dbContext.DeliveryTrackings
            .Where(d => d.DeliveryManId == userContext.UserId
                     && d.Status != DeliveryStatus.Delivered)
            .OrderByDescending(d => d.AcceptedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (tracking is null)
            return Result.Failure<ActiveDeliveryResponse>(
                DeliveryErrors.NotFoundByOrder(userContext.UserId));

        return Result.Success(new ActiveDeliveryResponse(
            DeliveryTrackingId: tracking.Id,
            OrderId: tracking.OrderId,
            Status: tracking.Status.ToString(),
            PickupLatitude: tracking.PickupLocation.Latitude,
            PickupLongitude: tracking.PickupLocation.Longitude,
            PickupAddress: tracking.PickupLocation.AddressLine,
            DropoffLatitude: tracking.DropoffLocation.Latitude,
            DropoffLongitude: tracking.DropoffLocation.Longitude,
            DropoffAddress: tracking.DropoffLocation.AddressLine,
            AcceptedAt: tracking.AcceptedAt,
            PickedUpAt: tracking.PickedUpAt));
    }
}
