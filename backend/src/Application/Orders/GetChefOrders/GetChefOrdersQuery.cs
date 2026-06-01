// File: Application/Orders/GetChefOrders/GetChefOrdersQuery.cs

using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Orders;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Orders.GetChefOrders;

public sealed record GetChefOrdersQuery(
    int Page = 1,
    int PageSize = 20,
    OrderStatus? Status = null
) : IQuery<List<ChefOrderResponse>>;

public sealed record ChefOrderResponse(
    Guid OrderId,
    Guid CustomerId,
    string Status,
    decimal Total,
    string Currency,
    DateTime CreatedAt,
    List<OrderItemResponse> Items);

public sealed record OrderItemResponse(
    Guid OrderItemId,
    Guid MealId,
    string MealName,
    string VariantName,
    decimal VariantPrice,
    string Currency,
    int Quantity,
    decimal LineTotal,
    List<SelectedSideDishSnapshot> SideDishes,
    List<SelectedToppingSnapshot> Toppings);

internal sealed class GetChefOrdersQueryHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext) : IQueryHandler<GetChefOrdersQuery, List<ChefOrderResponse>>
{
    public async Task<Result<List<ChefOrderResponse>>> Handle(
        GetChefOrdersQuery query,
        CancellationToken cancellationToken)
    {
        IQueryable<Order> ordersQuery = dbContext.Orders
            .Where(o => o.ChefId == userContext.UserId)
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt);

        if (query.Status.HasValue)
        {
            ordersQuery = ordersQuery.Where(o => o.Status == query.Status.Value);
        }

        var orders = await ordersQuery
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        var response = orders.Select(o => new ChefOrderResponse(
            OrderId: o.Id,
            CustomerId: o.CustomerId,
            Status: o.Status.ToString(),
            Total: o.Total.Amount,
            Currency: o.Total.Currency,
            CreatedAt: o.CreatedAt,
            Items: o.Items.Select(i => new OrderItemResponse(
                OrderItemId: i.Id,
                MealId: i.MealId,
                MealName: i.MealName,
                VariantName: i.VariantName,
                VariantPrice: i.VariantPrice.Amount,
                Currency: i.VariantPrice.Currency,
                Quantity: i.Quantity,
                LineTotal: i.LineTotal.Amount,
                SideDishes: i.SideDishes.ToList(),
                Toppings: i.Toppings.ToList()
            )).ToList()
        )).ToList();

        return Result.Success(response);
    }
}

internal sealed class GetChefOrdersQueryValidator : AbstractValidator<GetChefOrdersQuery>
{
    public GetChefOrdersQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
    }
}