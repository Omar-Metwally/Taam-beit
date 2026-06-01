
//using Domain.Users;
//using Microsoft.EntityFrameworkCore;
//using Microsoft.EntityFrameworkCore.Metadata.Builders;
//using NetTopologySuite.Geometries;

//namespace Infrastructure.Persistence.Configurations;

//internal sealed class ChefProfileConfiguration : IEntityTypeConfiguration<ChefProfile>
//{
//    public void Configure(EntityTypeBuilder<ChefProfile> builder)
//    {
//        builder.ToTable("chef_profiles");
//        builder.HasKey(c => c.Id);

//        builder.Property(c => c.PersonalIdReference).HasMaxLength(500).IsRequired(false);
//        builder.Property(c => c.HealthCertificateReference).HasMaxLength(500).IsRequired(false);
//        builder.Property(c => c.Status).IsRequired().HasConversion<string>();
//        builder.Property(c => c.RejectionReason).HasMaxLength(500);
//        builder.Property(c => c.AppliedAt).IsRequired();
//        builder.Property(c => c.ReviewedAt);
//        builder.Property(c => c.ReviewedByUserId);

//        builder.OwnsOne(c => c.OperationLocation, loc =>
//        {
//            loc.Property<Point>("_point")
//                .HasColumnName("operation_location")
//                .HasColumnType("geography(Point,4326)")
//                .IsRequired();

//            loc.Property(l => l.Latitude).HasColumnName("operation_location_lat");
//            loc.Property(l => l.Longitude).HasColumnName("operation_location_lng");
//            loc.Property(l => l.AddressLine)
//                .HasColumnName("operation_location_address")
//                .HasMaxLength(500)
//                .IsRequired(false);

//            loc.HasIndex("_point")
//                .HasDatabaseName("ix_chef_profiles_location_gist")
//                .HasMethod("gist");
//        });
//    }
//}
