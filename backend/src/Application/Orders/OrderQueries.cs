using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Orders;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

// ── GetOrderById ──────────────────────────────────────────────────────────────

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

// ── GetMyOrders ───────────────────────────────────────────────────────────────

namespace Application.Orders.GetMyOrders;

public sealed record GetMyOrdersQuery(int Page = 1, int PageSize = 20) : IQuery<List<OrderSummaryResponse>>;

public sealed record OrderSummaryResponse(
    Guid OrderId,
    Guid ChefId,
    string Status,
    decimal Total,
    string Currency,
    DateTime CreatedAt,
    int ItemCount);

internal sealed class GetMyOrdersQueryHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : IQueryHandler<GetMyOrdersQuery, List<OrderSummaryResponse>>
{
    public async Task<Result<List<OrderSummaryResponse>>> Handle(
        GetMyOrdersQuery query,
        CancellationToken cancellationToken)
    {
        var orders = await dbContext.Orders
            .Where(o => o.CustomerId == userContext.UserId)
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        var response = orders.Select(o => new OrderSummaryResponse(
            OrderId: o.Id,
            ChefId: o.ChefId,
            Status: o.Status.ToString(),
            Total: o.Total.Amount,
            Currency: o.Total.Currency,
            CreatedAt: o.CreatedAt,
            ItemCount: o.Items.Count)).ToList();

        return Result.Success(response);
    }
}

internal sealed class GetMyOrdersQueryValidator : AbstractValidator<GetMyOrdersQuery>
{
    public GetMyOrdersQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
    }
}
