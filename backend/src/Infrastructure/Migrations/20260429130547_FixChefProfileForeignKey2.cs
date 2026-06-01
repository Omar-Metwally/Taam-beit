using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixChefProfileForeignKey2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_chef_profiles_users_id",
                table: "chef_profiles");

            migrationBuilder.RenameColumn(
                name: "id1",
                table: "chef_profiles",
                newName: "user_id");

            migrationBuilder.RenameIndex(
                name: "ix_chef_profiles_id",
                table: "chef_profiles",
                newName: "ix_chef_profiles_user_id");

            migrationBuilder.AddForeignKey(
                name: "fk_chef_profiles_users_user_id",
                table: "chef_profiles",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_chef_profiles_users_user_id",
                table: "chef_profiles");

            migrationBuilder.RenameColumn(
                name: "user_id",
                table: "chef_profiles",
                newName: "id1");

            migrationBuilder.RenameIndex(
                name: "ix_chef_profiles_user_id",
                table: "chef_profiles",
                newName: "ix_chef_profiles_id");

            migrationBuilder.AddForeignKey(
                name: "fk_chef_profiles_users_id",
                table: "chef_profiles",
                column: "id1",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
