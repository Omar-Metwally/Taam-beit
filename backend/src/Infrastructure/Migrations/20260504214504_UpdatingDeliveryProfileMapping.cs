using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdatingDeliveryProfileMapping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_delivery_man_profiles_users_id",
                table: "delivery_man_profiles");

            migrationBuilder.RenameColumn(
                name: "id1",
                table: "delivery_man_profiles",
                newName: "user_id");

            migrationBuilder.RenameIndex(
                name: "ix_delivery_man_profiles_id",
                table: "delivery_man_profiles",
                newName: "ix_delivery_man_profiles_user_id");

            migrationBuilder.AddForeignKey(
                name: "fk_delivery_man_profiles_users_user_id",
                table: "delivery_man_profiles",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_delivery_man_profiles_users_user_id",
                table: "delivery_man_profiles");

            migrationBuilder.RenameColumn(
                name: "user_id",
                table: "delivery_man_profiles",
                newName: "id1");

            migrationBuilder.RenameIndex(
                name: "ix_delivery_man_profiles_user_id",
                table: "delivery_man_profiles",
                newName: "ix_delivery_man_profiles_id");

            migrationBuilder.AddForeignKey(
                name: "fk_delivery_man_profiles_users_id",
                table: "delivery_man_profiles",
                column: "id1",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
