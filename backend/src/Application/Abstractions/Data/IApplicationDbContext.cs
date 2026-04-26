using Domain.Deliveries;
using Domain.Meals;
using Domain.Orders;
using Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace Application.Abstractions.Data;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Meal> Meals { get; }
    DbSet<Order> Orders { get; }
    DbSet<DeliveryTracking> DeliveryTrackings { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
