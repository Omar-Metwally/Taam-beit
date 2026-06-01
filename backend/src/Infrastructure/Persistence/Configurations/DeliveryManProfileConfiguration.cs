
//using Domain.Users;
//using Microsoft.EntityFrameworkCore;
//using Microsoft.EntityFrameworkCore.Metadata.Builders;
//using NetTopologySuite.Geometries;

//namespace Infrastructure.Persistence.Configurations;

//internal sealed class DeliveryManProfileConfiguration
//    : IEntityTypeConfiguration<DeliveryManProfile>
//{
//    public void Configure(EntityTypeBuilder<DeliveryManProfile> builder)
//    {
//        builder.ToTable("delivery_man_profiles");

//        builder.HasKey(d => d.Id);

//        builder.Property(d => d.PersonalIdNumber)
//            .IsRequired()
//            .HasMaxLength(50);

//        builder.Property(d => d.VehicleType)
//            .IsRequired()
//            .HasConversion<string>();

//        builder.Property(d => d.Status)
//            .IsRequired()
//            .HasConversion<string>();

//        builder.Property(d => d.RejectionReason)
//            .HasMaxLength(500);

//        builder.Property(d => d.AppliedAt)
//            .IsRequired();

//        builder.Property(d => d.ReviewedAt);

//        builder.Property(d => d.ReviewedByUserId);

//        builder.OwnsOne(d => d.CurrentLocation, loc =>
//        {
//            loc.Property<Point>("_point")
//                .HasColumnName("current_location")
//                .HasColumnType("geography(Point,4326)")
//                .IsRequired(false);

//            loc.Property(l => l.Latitude)
//                .HasColumnName("current_location_lat");

//            loc.Property(l => l.Longitude)
//                .HasColumnName("current_location_lng");

//            loc.Property(l => l.AddressLine)
//                .HasColumnName("current_location_address")
//                .HasMaxLength(500)
//                .IsRequired(false);
//        });
//    }
//}
