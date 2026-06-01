using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Orders.GetCustomerOrders;

/// <summary>
/// Returns the calling customer's orders within a rolling date window.
/// No pagination — we cap the window instead (default 1 month, max 6 months).
/// Status filtering is intentionally left to the client; all statuses are
/// returned in one fetch and filtered in-memory to avoid a round trip per tab.
/// </summary>
public sealed record GetCustomerOrdersQuery(int MonthsBack = 1) : IQuery<List<CustomerOrderSummaryResponse>>;

public sealed record CustomerOrderItemSummary(
    string MealName,
    string VariantName,
    int Quantity,
    decimal LineTotal,
    string Currency);

public sealed record CustomerOrderSummaryResponse(
    Guid OrderId,
    Guid ChefId,
    string ChefName,
    string? ChefAvatarSmallUrl,
    string Status,
    decimal Total,
    string Currency,
    DateTime CreatedAt,
    IReadOnlyList<CustomerOrderItemSummary> Items);

internal sealed class GetCustomerOrdersQueryHandler(
    IApplicationDbContext dbContext,
    IUserContext userContext)
    : IQueryHandler<GetCustomerOrdersQuery, List<CustomerOrderSummaryResponse>>
{
    public async Task<Result<List<CustomerOrderSummaryResponse>>> Handle(
        GetCustomerOrdersQuery query,
        CancellationToken cancellationToken)
    {
        DateTime cutoff = DateTime.UtcNow.AddMonths(-query.MonthsBack);

        // Pull orders + items in one query.
        // Chef name and avatar come from a join to Users / ChefProfile.
        var rows = await dbContext.Orders
            .Where(o => o.CustomerId == userContext.UserId && o.CreatedAt >= cutoff)
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt)
            .Join(
                dbContext.Users.Include(u => u.ChefProfile),
                o => o.ChefId,
                u => u.Id,
                (o, u) => new { Order = o, Chef = u })
            .ToListAsync(cancellationToken);

        var response = rows.Select(r =>
        {
            // Resolve avatar small URL from the stored base key
            string? avatarSmallUrl = r.Chef.ChefProfile?.AvatarUrl is not null
                ? $"{r.Chef.ChefProfile.AvatarUrl}-sm.webp"
                : null;

            var items = r.Order.Items.Select(i => new CustomerOrderItemSummary(
                MealName: i.MealName,
                VariantName: i.VariantName,
                Quantity: i.Quantity,
                LineTotal: i.LineTotal.Amount,
                Currency: i.LineTotal.Currency)).ToList();

            return new CustomerOrderSummaryResponse(
                OrderId: r.Order.Id,
                ChefId: r.Order.ChefId,
                ChefName: r.Chef.FullName,
                ChefAvatarSmallUrl: avatarSmallUrl,
                Status: r.Order.Status.ToString(),
                Total: r.Order.Total.Amount,
                Currency: r.Order.Total.Currency,
                CreatedAt: r.Order.CreatedAt,
                Items: items);
        }).ToList();

        return Result.Success(response);
    }
}

internal sealed class GetCustomerOrdersQueryValidator : AbstractValidator<GetCustomerOrdersQuery>
{
    public GetCustomerOrdersQueryValidator()
    {
        RuleFor(x => x.MonthsBack).InclusiveBetween(1, 6);
    }
}