using Domain.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NetTopologySuite.Geometries;

namespace Infrastructure.Persistence.Configurations;

internal sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("orders");

        builder.HasKey(o => o.Id);
        builder.Property(o => o.CustomerId).IsRequired();
        builder.Property(o => o.ChefId).IsRequired();
        builder.Property(o => o.DeliveryManId);

        builder.Property(o => o.Status)
            .IsRequired()
            .HasConversion<string>();

        builder.Property(o => o.PaymentMethod)
            .IsRequired()
            .HasConversion<string>();

        builder.Property(o => o.PaymentStatus)
            .IsRequired()
            .HasConversion<string>();

        builder.Property(o => o.RejectionReason).HasMaxLength(500);
        builder.Property(o => o.CancellationReason).HasMaxLength(500);
        builder.Property(o => o.CreatedAt).IsRequired();
        builder.Property(o => o.ConfirmedAt);
        builder.Property(o => o.ReadyAt);
        builder.Property(o => o.DeliveredAt);

        builder.OwnsOne(o => o.DeliveryLocation, loc =>
        {
            loc.Property<Point>("_point")
                .HasColumnName("delivery_location")
                .HasColumnType("geography(Point,4326)")
                .IsRequired();

            loc.Property(l => l.Latitude).HasColumnName("delivery_location_lat");
            loc.Property(l => l.Longitude).HasColumnName("delivery_location_lng");
            loc.Property(l => l.AddressLine)
                .HasColumnName("delivery_location_address")
                .HasMaxLength(500)
                .IsRequired(false);
        });

        builder.HasIndex("delivery_location_lat", "delivery_location_lng")
            .HasDatabaseName("ix_orders_delivery_location_gist")
            .HasMethod("gist")
            .HasFilter("\"status\" != 'Delivered'");

        builder.HasIndex(o => new { o.ChefId, o.Status })
            .HasDatabaseName("ix_orders_chef_status");

        builder.HasIndex(o => new { o.CustomerId, o.CreatedAt })
            .HasDatabaseName("ix_orders_customer_created");

        // OrderItems — owned collection
        builder.OwnsMany(o => o.Items, item =>
        {
            item.ToTable("order_items");
            item.HasKey(i => i.Id);
            item.Property(i => i.OrderId).IsRequired();
            item.Property(i => i.MealId).IsRequired();
            item.Property(i => i.MealName).IsRequired().HasMaxLength(200);

            // Variant snapshot columns
            item.Property(i => i.MealVariantId).IsRequired();
            item.Property(i => i.VariantName).IsRequired().HasMaxLength(100);

            item.OwnsOne(i => i.VariantPrice, money =>
            {
                money.Property(p => p.Amount)
                    .HasColumnName("variant_price_amount")
                    .HasColumnType("numeric(18,2)")
                    .IsRequired();

                money.Property(p => p.Currency)
                    .HasColumnName("variant_price_currency")
                    .HasMaxLength(3)
                    .IsRequired();
            });

            item.Property(i => i.Quantity).IsRequired();

            // Side dish and topping selections stored as JSONB snapshots
            item.Property<string>("_sideDishesJson")
                .HasColumnName("selected_side_dishes")
                .HasColumnType("jsonb")
                .IsRequired();

            item.Property<string>("_toppingsJson")
                .HasColumnName("selected_toppings")
                .HasColumnType("jsonb")
                .IsRequired();
        });
    }
}
