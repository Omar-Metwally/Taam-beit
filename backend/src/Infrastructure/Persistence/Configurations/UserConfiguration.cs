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

        // DefaultDeliveryLocation stored as PostGIS geography(Point, 4326)
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

            // Store lat/lng as computed properties alongside the geography column
            loc.Property(l => l.Latitude).HasColumnName("default_location_lat");
            loc.Property(l => l.Longitude).HasColumnName("default_location_lng");
        });

        // ChefProfile as owned entity — maps to separate table
        builder.OwnsOne(u => u.ChefProfile, chef =>
        {
            chef.ToTable("chef_profiles");
            chef.HasKey(c => c.Id);

            // Document object keys — stored as MinIO object keys, never as URLs
            // Presigned URLs generated on demand; these keys may be null until uploaded
            chef.Property(c => c.PersonalIdReference)
                .HasMaxLength(500)
                .IsRequired(false);

            chef.Property(c => c.HealthCertificateReference)
                .HasMaxLength(500)
                .IsRequired(false);
            chef.Property(c => c.Status).IsRequired()
                .HasConversion<string>();
            chef.Property(c => c.RejectionReason).HasMaxLength(500);
            chef.Property(c => c.AppliedAt).IsRequired();
            chef.Property(c => c.ReviewedAt);
            chef.Property(c => c.ReviewedByUserId);

            // OperationLocation as PostGIS geography
            chef.OwnsOne(c => c.OperationLocation, loc =>
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
            });

            // Spatial index for ST_DWithin chef discovery queries
            chef.HasIndex("operation_location_lat", "operation_location_lng")
                .HasDatabaseName("ix_chef_profiles_location_gist")
                .HasMethod("gist");
        });

        // DeliveryManProfile as owned entity — maps to separate table
        builder.OwnsOne(u => u.DeliveryManProfile, dm =>
        {
            dm.ToTable("delivery_man_profiles");
            dm.HasKey(d => d.Id);

            dm.Property(d => d.PersonalIdNumber).IsRequired().HasMaxLength(50);
            dm.Property(d => d.VehicleType).IsRequired().HasConversion<string>();
            dm.Property(d => d.Status).IsRequired().HasConversion<string>();
            dm.Property(d => d.RejectionReason).HasMaxLength(500);
            dm.Property(d => d.AppliedAt).IsRequired();
            dm.Property(d => d.ReviewedAt);
            dm.Property(d => d.ReviewedByUserId);

            // CurrentLocation — nullable (delivery man may not have reported yet)
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
