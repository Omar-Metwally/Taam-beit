using Domain.Meals;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class MealConfiguration : IEntityTypeConfiguration<Meal>
{
    public void Configure(EntityTypeBuilder<Meal> builder)
    {
        builder.ToTable("meals");

        builder.HasKey(m => m.Id);
        builder.Property(m => m.ChefId).IsRequired();
        builder.Property(m => m.Name).IsRequired().HasMaxLength(200);
        builder.Property(m => m.Description).HasMaxLength(1000);
        builder.Property(m => m.IsAvailable).IsRequired();

        builder.Property(m => m.DishType)
            .IsRequired()
            .HasConversion<string>();

        builder.Property(m => m.CuisineType)
            .HasMaxLength(100)
            .IsRequired(false);

        // Indexes for the browse/filter queries
        builder.HasIndex(m => m.DishType)
            .HasDatabaseName("ix_meals_dish_type");

        builder.HasIndex(m => m.CuisineType)
            .HasDatabaseName("ix_meals_cuisine_type")
            .HasFilter("cuisine_type IS NOT NULL");
        builder.Property(m => m.CreatedAt).IsRequired();
        builder.Property(m => m.ImageUrl).HasMaxLength(1000);

        // MealVariants — owned collection in separate table
        // BasePrice is gone — price lives on the variant
        builder.OwnsMany(m => m.Variants, v =>
        {
            v.ToTable("meal_variants");
            v.HasKey(x => x.Id);
            v.Property(x => x.MealId).IsRequired();
            v.Property(x => x.Name).IsRequired().HasMaxLength(100);
            v.Property(x => x.IsDefault).IsRequired();

            v.OwnsOne(x => x.Price, money =>
            {
                money.Property(p => p.Amount)
                    .HasColumnName("price_amount")
                    .HasColumnType("numeric(18,2)")
                    .IsRequired();

                money.Property(p => p.Currency)
                    .HasColumnName("price_currency")
                    .HasMaxLength(3)
                    .IsRequired();
            });

            // Partial index — enforces exactly one default per meal at the DB level
            v.HasIndex(x => new { x.MealId, x.IsDefault })
                .HasDatabaseName("ix_meal_variants_default")
                .HasFilter("is_default = true");
        });

        // SideDishes — owned collection
        builder.OwnsMany(m => m.SideDishes, sd =>
        {
            sd.ToTable("side_dishes");
            sd.HasKey(s => s.Id);
            sd.Property(s => s.MealId).IsRequired();
            sd.Property(s => s.Name).IsRequired().HasMaxLength(200);
            sd.Property(s => s.Description).HasMaxLength(500);
            sd.Property(s => s.IsRequired).IsRequired();

            sd.OwnsOne(s => s.Price, money =>
            {
                money.Property(p => p.Amount)
                    .HasColumnName("price_amount")
                    .HasColumnType("numeric(18,2)")
                    .IsRequired();

                money.Property(p => p.Currency)
                    .HasColumnName("price_currency")
                    .HasMaxLength(3)
                    .IsRequired();
            });
        });

        // ToppingGroups — owned collection
        builder.OwnsMany(m => m.ToppingGroups, tg =>
        {
            tg.ToTable("topping_groups");
            tg.HasKey(g => g.Id);
            tg.Property(g => g.MealId).IsRequired();
            tg.Property(g => g.Name).IsRequired().HasMaxLength(100);
            tg.Property(g => g.MinSelections).IsRequired();
            tg.Property(g => g.MaxSelections).IsRequired();

            tg.OwnsMany(g => g.Options, opt =>
            {
                opt.ToTable("topping_options");
                opt.HasKey(o => o.Id);
                opt.Property(o => o.ToppingGroupId).IsRequired();
                opt.Property(o => o.Name).IsRequired().HasMaxLength(100);

                opt.OwnsOne(o => o.ExtraPrice, money =>
                {
                    money.Property(p => p.Amount)
                        .HasColumnName("extra_price_amount")
                        .HasColumnType("numeric(18,2)")
                        .IsRequired();

                    money.Property(p => p.Currency)
                        .HasColumnName("extra_price_currency")
                        .HasMaxLength(3)
                        .IsRequired();
                });
            });
        });
    }
}
