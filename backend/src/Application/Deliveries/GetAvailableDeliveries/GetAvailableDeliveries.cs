using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Geospatial;
using Application.Abstractions.Messaging;
using Domain.Orders;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Deliveries.GetAvailableDeliveries;

// ── Query + Response ──────────────────────────────────────────────────────────

public sealed record GetAvailableDeliveriesQuery(
    double? Latitude = null,   // optional: client GPS override
    double? Longitude = null,
    double RadiusKm = 30)      // default 20 km
    : IQuery<IReadOnlyList<AvailableDeliveryResponse>>;

public sealed record AvailableDeliveryResponse(
    Guid OrderId,
    Guid ChefId,
    string ChefName,
    double PickupLatitude,
    double PickupLongitude,
    string? PickupAddress,
    double DropoffLatitude,
    double DropoffLongitude,
    string? DropoffAddress,
    decimal Total,
    string Currency,
    IReadOnlyList<AvailableDeliveryItemResponse> Items);

public sealed record AvailableDeliveryItemResponse(
    string MealName,
    string VariantName,
    int Quantity,
    decimal LineTotal,
    string Currency);

// ── Handler ───────────────────────────────────────────────────────────────────

internal sealed class GetAvailableDeliveriesQueryHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext,
    IGeospatialService geospatialService,
    IDeliveryPositionCache deliveryPositionCache)
    : IQueryHandler<GetAvailableDeliveriesQuery, IReadOnlyList<AvailableDeliveryResponse>>
{
    public async Task<Result<IReadOnlyList<AvailableDeliveryResponse>>> Handle(
        GetAvailableDeliveriesQuery query,
        CancellationToken cancellationToken)
    {
        // 1. Guard: only approved delivery men
        var deliveryMan = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userContext.UserId, cancellationToken);

        if (deliveryMan is null || !deliveryMan.IsApprovedDeliveryMan)
            return Result.Failure<IReadOnlyList<AvailableDeliveryResponse>>(
                UserErrors.DeliveryManProfileNotActive);

        // 2. Resolve driver location (client override → cache fallback)
        double driverLat;
        double driverLng;

        if (query.Latitude.HasValue && query.Longitude.HasValue)
        {
            driverLat = query.Latitude.Value;
            driverLng = query.Longitude.Value;
        }
        else
        {
            var cached = await deliveryPositionCache.GetDriverPositionAsync(
                userContext.UserId, cancellationToken);

            if (cached is null)
                return Result.Success<IReadOnlyList<AvailableDeliveryResponse>>([]);

            driverLat = cached.Latitude;
            driverLng = cached.Longitude;
        }

        // 3. Find nearby chefs using the existing PostGIS GIST index
        var nearbyChefs = await geospatialService.FindChefsNearLocationAsync(
            driverLat, driverLng, query.RadiusKm, cancellationToken);

        if (nearbyChefs.Count == 0)
            return Result.Success<IReadOnlyList<AvailableDeliveryResponse>>([]);

        var nearbyChefIds = nearbyChefs.Select(c => c.ChefUserId).ToHashSet();

        // 4. Load only orders from those chefs that are ready & unassigned
        var orders = await dbContext.Orders
            .AsNoTracking()
            .Where(o => o.Status == OrderStatus.ReadyForPickup
                     && o.DeliveryManId == null
                     && nearbyChefIds.Contains(o.ChefId))
            .Include(o => o.Items)
            .OrderByDescending(o => o.ReadyAt)
            .ToListAsync(cancellationToken);

        if (orders.Count == 0)
            return Result.Success<IReadOnlyList<AvailableDeliveryResponse>>([]);

        // 5. Batch-load chef details for projection
        var chefIds = orders.Select(o => o.ChefId).Distinct().ToList();

        var chefById = await dbContext.Users
            .AsNoTracking()
            .Where(u => chefIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                OperationLatitude = u.ChefProfile!.OperationLocation.Latitude,
                OperationLongitude = u.ChefProfile!.OperationLocation.Longitude,
                OperationAddress = u.ChefProfile!.OperationLocation.AddressLine,
            })
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        var response = orders
            .Where(o => chefById.ContainsKey(o.ChefId))
            .Select(o =>
            {
                var chef = chefById[o.ChefId];
                var total = o.Total;

                return new AvailableDeliveryResponse(
                    OrderId: o.Id,
                    ChefId: o.ChefId,
                    ChefName: $"{chef.FirstName} {chef.LastName}",
                    PickupLatitude: chef.OperationLatitude,
                    PickupLongitude: chef.OperationLongitude,
                    PickupAddress: chef.OperationAddress,
                    DropoffLatitude: o.DeliveryLocation.Latitude,
                    DropoffLongitude: o.DeliveryLocation.Longitude,
                    DropoffAddress: o.DeliveryLocation.AddressLine,
                    Total: total.Amount,
                    Currency: total.Currency,
                    Items: o.Items.Select(i => new AvailableDeliveryItemResponse(
                        MealName: i.MealName,
                        VariantName: i.VariantName,
                        Quantity: i.Quantity,
                        LineTotal: i.LineTotal.Amount,
                        Currency: i.LineTotal.Currency
                    )).ToList());
            })
            .ToList();

        return Result.Success<IReadOnlyList<AvailableDeliveryResponse>>(response);
    }
}