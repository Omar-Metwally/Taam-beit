using Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NetTopologySuite.Geometries;

namespace Infrastructure.Persistence.Configurations;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(256);

        builder.HasIndex(u => u.Email)
            .IsUnique();

        builder.Property(u => u.FirstName).IsRequired().HasMaxLength(100);
        builder.Property(u => u.LastName).IsRequired().HasMaxLength(100);
        builder.Property(u => u.PasswordHash).IsRequired();
        builder.Property(u => u.CreatedAt).IsRequired();

        // ── DefaultDeliveryLocation ─────────────────────────────────────────────
        builder.OwnsOne(u => u.DefaultDeliveryLocation, loc =>
        {
            loc.Property<Point>("_point")
                .HasColumnName("default_location")
                .HasColumnType("geography(Point,4326)")
                .IsRequired(false);

            loc.Property(l => l.AddressLine)
                .HasColumnName("default_location_address")
                .HasMaxLength(500)
                .IsRequired(false);

            loc.Property(l => l.Latitude).HasColumnName("default_location_lat");
            loc.Property(l => l.Longitude).HasColumnName("default_location_lng");
        });

        // ── ChefProfile (owned) ─────────────────────────────────────────────────
        builder.OwnsOne(u => u.ChefProfile, cp =>
        {
            cp.ToTable("chef_profiles");

            // Shared PK / FK
            cp.HasKey(c => c.UserId);
            cp.Property(c => c.UserId).HasColumnName("user_id");
            cp.WithOwner().HasForeignKey(c => c.UserId);

            cp.Property(c => c.PersonalIdReference).HasMaxLength(500).IsRequired(false);
            cp.Property(c => c.HealthCertificateReference).HasMaxLength(500).IsRequired(false);
            cp.Property(c => c.Status).IsRequired().HasConversion<string>();
            cp.Property(c => c.RejectionReason).HasMaxLength(500);
            cp.Property(c => c.AppliedAt).IsRequired();
            cp.Property(c => c.ReviewedAt);
            cp.Property(c => c.ReviewedByUserId);
            cp.Property(c => c.AvatarUrl);

            cp.OwnsOne(c => c.OperationLocation, loc =>
            {
                loc.Property<Point>("_point")
                    .HasColumnName("operation_location")
                    .HasColumnType("geography(Point,4326)")
                    .IsRequired();

                loc.Property(l => l.Latitude).HasColumnName("operation_location_lat");
                loc.Property(l => l.Longitude).HasColumnName("operation_location_lng");
                loc.Property(l => l.AddressLine)
                    .HasColumnName("operation_location_address")
                    .HasMaxLength(500)
                    .IsRequired(false);

                loc.HasIndex("_point")
                    .HasDatabaseName("ix_chef_profiles_location_gist")
                    .HasMethod("gist");
            });
        });

        // ── DeliveryManProfile (owned) ──────────────────────────────────────────
        builder.OwnsOne(u => u.DeliveryManProfile, dm =>
        {
            dm.ToTable("delivery_man_profiles");

            // Shared PK / FK
            dm.HasKey(d => d.UserId);
            dm.Property(d => d.UserId).HasColumnName("user_id");
            dm.WithOwner().HasForeignKey(d => d.UserId);

            dm.Property(d => d.PersonalIdNumber).IsRequired().HasMaxLength(50);
            dm.Property(d => d.VehicleType).IsRequired().HasConversion<string>();
            dm.Property(d => d.Status).IsRequired().HasConversion<string>();
            dm.Property(d => d.RejectionReason).HasMaxLength(500);
            dm.Property(d => d.AppliedAt).IsRequired();
            dm.Property(d => d.ReviewedAt);
            dm.Property(d => d.ReviewedByUserId);

            dm.OwnsOne(d => d.CurrentLocation, loc =>
            {
                loc.Property<Point>("_point")
                    .HasColumnName("current_location")
                    .HasColumnType("geography(Point,4326)")
                    .IsRequired(false);

                loc.Property(l => l.Latitude).HasColumnName("current_location_lat");
                loc.Property(l => l.Longitude).HasColumnName("current_location_lng");
                loc.Property(l => l.AddressLine)
                    .HasColumnName("current_location_address")
                    .HasMaxLength(500)
                    .IsRequired(false);
            });
        });
    }
}