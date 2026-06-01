using Domain.Deliveries;
using Infrastructure.Persistence.Outbox;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NetTopologySuite.Geometries;

namespace Infrastructure.Persistence.Configurations;

internal sealed class DeliveryTrackingConfiguration : IEntityTypeConfiguration<DeliveryTracking>
{
    public void Configure(EntityTypeBuilder<DeliveryTracking> builder)
    {
        builder.ToTable("delivery_trackings");

        builder.HasKey(d => d.Id);
        builder.Property(d => d.OrderId).IsRequired();
        builder.Property(d => d.DeliveryManId).IsRequired();

        builder.Property(d => d.Status)
            .IsRequired()
            .HasConversion<string>();

        builder.Property(d => d.AcceptedAt).IsRequired();
        builder.Property(d => d.PickedUpAt);
        builder.Property(d => d.DeliveredAt);

        // PickupLocation snapshot — where the delivery man picks up from
        builder.OwnsOne(d => d.PickupLocation, loc =>
        {
            loc.Property<Point>("_point")
                .HasColumnName("pickup_location")
                .HasColumnType("geography(Point,4326)")
                .IsRequired();

            loc.Property(l => l.Latitude).HasColumnName("pickup_location_lat");
            loc.Property(l => l.Longitude).HasColumnName("pickup_location_lng");
            loc.Property(l => l.AddressLine)
                .HasColumnName("pickup_location_address")
                .HasMaxLength(500)
                .IsRequired(false);
        });

        // DropoffLocation snapshot — where the delivery man delivers to
        builder.OwnsOne(d => d.DropoffLocation, loc =>
        {
            loc.Property<Point>("_point")
                .HasColumnName("dropoff_location")
                .HasColumnType("geography(Point,4326)")
                .IsRequired();

            loc.Property(l => l.Latitude).HasColumnName("dropoff_location_lat");
            loc.Property(l => l.Longitude).HasColumnName("dropoff_location_lng");
            loc.Property(l => l.AddressLine)
                .HasColumnName("dropoff_location_address")
                .HasMaxLength(500)
                .IsRequired(false);
        });

        builder.HasIndex(d => d.OrderId)
            .HasDatabaseName("ix_delivery_trackings_order_id");

        builder.HasIndex(d => new { d.DeliveryManId, d.Status })
            .HasDatabaseName("ix_delivery_trackings_driver_status");
    }
}

internal sealed class OutboxMessageConfiguration : IEntityTypeConfiguration<OutboxMessage>
{
    public void Configure(EntityTypeBuilder<OutboxMessage> builder)
    {
        builder.ToTable("outbox_messages");

        builder.HasKey(o => o.Id);
        builder.Property(o => o.Type).IsRequired().HasMaxLength(500);
        builder.Property(o => o.Payload).IsRequired().HasColumnType("jsonb");
        builder.Property(o => o.CreatedAt).IsRequired();
        builder.Property(o => o.ProcessedAt);
        builder.Property(o => o.Error).HasMaxLength(2000);

        // Index to efficiently poll unprocessed messages
        builder.HasIndex(o => o.ProcessedAt)
            .HasDatabaseName("ix_outbox_messages_processed_at")
            .HasFilter("processed_at IS NULL");
    }
}
