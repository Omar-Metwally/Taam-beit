using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Common;
using Domain.Orders;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Orders.GetOrderById;

public sealed record GetOrderByIdQuery(Guid OrderId) : IQuery<OrderDetailResponse>;

public sealed record OrderDetailResponse(
    Guid OrderId,
    Guid CustomerId,
    Guid ChefId,
    Guid? DeliveryManId,
    string Status,
    string PaymentMethod,
    string PaymentStatus,
    decimal Total,
    string Currency,
    DateTime CreatedAt,
    Location DeliveryLocation,
    DateTime? DeliveredAt,
    string? RejectionReason,
    string? CancellationReason,
    List<OrderItemDetailResponse> Items);

public sealed record OrderItemDetailResponse(
    Guid MealId,
    string MealName,
    Guid MealVariantId,
    string VariantName,
    decimal VariantPrice,
    int Quantity,
    decimal LineTotal,
    string Currency,
    List<string> SelectedSideDishes,
    List<string> SelectedToppings);

internal sealed class GetOrderByIdQueryHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : IQueryHandler<GetOrderByIdQuery, OrderDetailResponse>
{
    public async Task<Result<OrderDetailResponse>> Handle(
        GetOrderByIdQuery query,
        CancellationToken cancellationToken)
    {
        Order? order = await dbContext.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == query.OrderId, cancellationToken);

        if (order is null)
            return Result.Failure<OrderDetailResponse>(OrderErrors.NotFound(query.OrderId));

        // Only customer, chef, or assigned delivery man can view the order
        bool canView = order.CustomerId == userContext.UserId
            || order.ChefId == userContext.UserId
            || order.DeliveryManId == userContext.UserId;

        if (!canView)
            return Result.Failure<OrderDetailResponse>(UserErrors.Unauthorized);

        return Result.Success(MapOrder(order));
    }

    private static OrderDetailResponse MapOrder(Order order) => new(
        OrderId: order.Id,
        CustomerId: order.CustomerId,
        ChefId: order.ChefId,
        DeliveryManId: order.DeliveryManId,
        Status: order.Status.ToString(),
        PaymentMethod: order.PaymentMethod.ToString(),
        PaymentStatus: order.PaymentStatus.ToString(),
        Total: order.Total.Amount,
        Currency: order.Total.Currency,
        CreatedAt: order.CreatedAt,
        DeliveryLocation: order.DeliveryLocation,
        DeliveredAt: order.DeliveredAt,
        RejectionReason: order.RejectionReason,
        CancellationReason: order.CancellationReason,
        Items: order.Items.Select(i => new OrderItemDetailResponse(
            MealId: i.MealId,
            MealName: i.MealName,
            MealVariantId: i.MealVariantId,
            VariantName: i.VariantName,
            VariantPrice: i.VariantPrice.Amount,
            Quantity: i.Quantity,
            LineTotal: i.LineTotal.Amount,
            Currency: i.VariantPrice.Currency,
            SelectedSideDishes: i.SideDishes.Select(s => s.Name).ToList(),
            SelectedToppings: i.Toppings
                .Select(t => $"{t.GroupName}: {t.OptionName}")
                .ToList())).ToList());
}

internal sealed class GetOrderByIdQueryValidator : AbstractValidator<GetOrderByIdQuery>
{
    public GetOrderByIdQueryValidator() => RuleFor(x => x.OrderId).NotEmpty();
}