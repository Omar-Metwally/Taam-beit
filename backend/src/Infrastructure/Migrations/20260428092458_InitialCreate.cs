using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,");

            migrationBuilder.CreateTable(
                name: "delivery_trackings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    delivery_man_id = table.Column<Guid>(type: "uuid", nullable: false),
                    pickup_location_lat = table.Column<double>(type: "double precision", nullable: false),
                    pickup_location_lng = table.Column<double>(type: "double precision", nullable: false),
                    pickup_location_address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    pickup_location = table.Column<Point>(type: "geography(Point,4326)", nullable: false),
                    dropoff_location_lat = table.Column<double>(type: "double precision", nullable: false),
                    dropoff_location_lng = table.Column<double>(type: "double precision", nullable: false),
                    dropoff_location_address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    dropoff_location = table.Column<Point>(type: "geography(Point,4326)", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    accepted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    picked_up_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    delivered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_delivery_trackings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "meals",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    chef_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    is_available = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    image_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    dish_type = table.Column<string>(type: "text", nullable: false),
                    cuisine_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_meals", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "orders",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    chef_id = table.Column<Guid>(type: "uuid", nullable: false),
                    delivery_man_id = table.Column<Guid>(type: "uuid", nullable: true),
                    delivery_location_lat = table.Column<double>(type: "double precision", nullable: false),
                    delivery_location_lng = table.Column<double>(type: "double precision", nullable: false),
                    delivery_location_address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    delivery_location = table.Column<Point>(type: "geography(Point,4326)", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    payment_method = table.Column<string>(type: "text", nullable: false),
                    payment_status = table.Column<string>(type: "text", nullable: false),
                    rejection_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    cancellation_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ready_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    delivered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_orders", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "outbox_messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    payload = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    processed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    error = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_outbox_messages", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    default_location_lat = table.Column<double>(type: "double precision", nullable: true),
                    default_location_lng = table.Column<double>(type: "double precision", nullable: true),
                    default_location_address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    default_location = table.Column<Point>(type: "geography(Point,4326)", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "meal_variants",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    meal_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    price_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    price_currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    is_default = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_meal_variants", x => x.id);
                    table.ForeignKey(
                        name: "fk_meal_variants_meals_meal_id",
                        column: x => x.meal_id,
                        principalTable: "meals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "side_dishes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    meal_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    price_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    price_currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    is_required = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_side_dishes", x => x.id);
                    table.ForeignKey(
                        name: "fk_side_dishes_meals_meal_id",
                        column: x => x.meal_id,
                        principalTable: "meals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "topping_groups",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    meal_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    min_selections = table.Column<int>(type: "integer", nullable: false),
                    max_selections = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_topping_groups", x => x.id);
                    table.ForeignKey(
                        name: "fk_topping_groups_meals_meal_id",
                        column: x => x.meal_id,
                        principalTable: "meals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "order_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    meal_id = table.Column<Guid>(type: "uuid", nullable: false),
                    meal_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    meal_variant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    variant_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    variant_price_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    variant_price_currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    selected_side_dishes = table.Column<string>(type: "jsonb", nullable: false),
                    selected_toppings = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_order_items", x => x.id);
                    table.ForeignKey(
                        name: "fk_order_items_orders_order_id",
                        column: x => x.order_id,
                        principalTable: "orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "chef_profiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    id1 = table.Column<Guid>(type: "uuid", nullable: false),
                    personal_id_reference = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    health_certificate_reference = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    operation_location_lat = table.Column<double>(type: "double precision", nullable: false),
                    operation_location_lng = table.Column<double>(type: "double precision", nullable: false),
                    operation_location_address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    operation_location = table.Column<Point>(type: "geography(Point,4326)", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    rejection_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    avatar_url = table.Column<string>(type: "text", nullable: true),
                    applied_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_chef_profiles", x => x.id);
                    table.ForeignKey(
                        name: "fk_chef_profiles_users_id",
                        column: x => x.id1,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "delivery_man_profiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    id1 = table.Column<Guid>(type: "uuid", nullable: false),
                    personal_id_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    vehicle_type = table.Column<string>(type: "text", nullable: false),
                    current_location_lat = table.Column<double>(type: "double precision", nullable: true),
                    current_location_lng = table.Column<double>(type: "double precision", nullable: true),
                    current_location_address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    current_location = table.Column<Point>(type: "geography(Point,4326)", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    rejection_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    applied_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_delivery_man_profiles", x => x.id);
                    table.ForeignKey(
                        name: "fk_delivery_man_profiles_users_id",
                        column: x => x.id1,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "topping_options",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    topping_group_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    extra_price_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    extra_price_currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_topping_options", x => x.id);
                    table.ForeignKey(
                        name: "fk_topping_options_topping_groups_topping_group_id",
                        column: x => x.topping_group_id,
                        principalTable: "topping_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_chef_profiles_id",
                table: "chef_profiles",
                column: "id1",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_chef_profiles_location_gist",
                table: "chef_profiles",
                column: "operation_location")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "ix_delivery_man_profiles_id",
                table: "delivery_man_profiles",
                column: "id1",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_delivery_trackings_driver_status",
                table: "delivery_trackings",
                columns: new[] { "delivery_man_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_delivery_trackings_order_id",
                table: "delivery_trackings",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "ix_meal_variants_default",
                table: "meal_variants",
                columns: new[] { "meal_id", "is_default" },
                filter: "is_default = true");

            migrationBuilder.CreateIndex(
                name: "ix_meals_cuisine_type",
                table: "meals",
                column: "cuisine_type",
                filter: "cuisine_type IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_meals_dish_type",
                table: "meals",
                column: "dish_type");

            migrationBuilder.CreateIndex(
                name: "ix_order_items_order_id",
                table: "order_items",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "ix_orders_chef_status",
                table: "orders",
                columns: new[] { "chef_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_orders_customer_created",
                table: "orders",
                columns: new[] { "customer_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_orders_delivery_location_gist",
                table: "orders",
                column: "delivery_location")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_messages_processed_at",
                table: "outbox_messages",
                column: "processed_at",
                filter: "processed_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_side_dishes_meal_id",
                table: "side_dishes",
                column: "meal_id");

            migrationBuilder.CreateIndex(
                name: "ix_topping_groups_meal_id",
                table: "topping_groups",
                column: "meal_id");

            migrationBuilder.CreateIndex(
                name: "ix_topping_options_topping_group_id",
                table: "topping_options",
                column: "topping_group_id");

            migrationBuilder.CreateIndex(
                name: "ix_users_email",
                table: "users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chef_profiles");

            migrationBuilder.DropTable(
                name: "delivery_man_profiles");

            migrationBuilder.DropTable(
                name: "delivery_trackings");

            migrationBuilder.DropTable(
                name: "meal_variants");

            migrationBuilder.DropTable(
                name: "order_items");

            migrationBuilder.DropTable(
                name: "outbox_messages");

            migrationBuilder.DropTable(
                name: "side_dishes");

            migrationBuilder.DropTable(
                name: "topping_options");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "orders");

            migrationBuilder.DropTable(
                name: "topping_groups");

            migrationBuilder.DropTable(
                name: "meals");
        }
    }
}
