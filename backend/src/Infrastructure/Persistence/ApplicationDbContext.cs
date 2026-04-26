using Application.Abstractions.Data;
using Domain.Deliveries;
using Domain.Meals;
using Domain.Orders;
using Domain.Users;
using Infrastructure.Persistence.Outbox;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using SharedKernel;

namespace Infrastructure.Persistence;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : DbContext(options), IApplicationDbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Meal> Meals => Set<Meal>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<DeliveryTracking> DeliveryTrackings => Set<DeliveryTracking>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply all IEntityTypeConfiguration classes in this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        // Enable PostGIS extension
        modelBuilder.HasPostgresExtension("postgis");
        modelBuilder.HasPostgresExtension("h3");
    }

    /// <summary>
    /// Before persisting, serialises all pending domain events from aggregates
    /// into OutboxMessage rows — same transaction, guaranteed delivery.
    /// </summary>
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        AddOutboxMessages();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void AddOutboxMessages()
    {
        var domainEvents = ChangeTracker
            .Entries<Entity>()
            .SelectMany(e => e.Entity.DomainEvents)
            .ToList();

        var outboxMessages = domainEvents.Select(e => new OutboxMessage
        {
            Id = Guid.NewGuid(),
            Type = e.GetType().AssemblyQualifiedName!,
            Payload = JsonConvert.SerializeObject(e, new JsonSerializerSettings
            {
                TypeNameHandling = TypeNameHandling.All
            }),
            CreatedAt = DateTime.UtcNow
        }).ToList();

        // Clear events from all aggregates after capturing them
        foreach (var entry in ChangeTracker.Entries<Entity>())
            entry.Entity.ClearDomainEvents();

        Set<OutboxMessage>().AddRange(outboxMessages);
    }
}
