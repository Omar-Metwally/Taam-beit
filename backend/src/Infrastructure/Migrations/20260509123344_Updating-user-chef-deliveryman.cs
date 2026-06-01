using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Updatinguserchefdeliveryman : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_chef_profiles_users_user_id",
                table: "chef_profiles");

            migrationBuilder.DropForeignKey(
                name: "fk_delivery_man_profiles_users_user_id",
                table: "delivery_man_profiles");

            migrationBuilder.DropPrimaryKey(
                name: "pk_delivery_man_profiles",
                table: "delivery_man_profiles");

            migrationBuilder.DropIndex(
                name: "ix_delivery_man_profiles_user_id",
                table: "delivery_man_profiles");

            migrationBuilder.DropPrimaryKey(
                name: "pk_chef_profiles",
                table: "chef_profiles");

            migrationBuilder.DropIndex(
                name: "ix_chef_profiles_user_id",
                table: "chef_profiles");

            migrationBuilder.DropColumn(
                name: "is_available",
                table: "meals");

            migrationBuilder.DropColumn(
                name: "id",
                table: "delivery_man_profiles");

            migrationBuilder.DropColumn(
                name: "id",
                table: "chef_profiles");

            migrationBuilder.AddColumn<DateTime>(
                name: "archived_at",
                table: "meals",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "meals",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "pk_delivery_man_profiles",
                table: "delivery_man_profiles",
                column: "user_id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_chef_profiles",
                table: "chef_profiles",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_meals_status",
                table: "meals",
                column: "status");

            migrationBuilder.AddForeignKey(
                name: "fk_chef_profiles_users_id",
                table: "chef_profiles",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_delivery_man_profiles_users_id",
                table: "delivery_man_profiles",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_chef_profiles_users_id",
                table: "chef_profiles");

            migrationBuilder.DropForeignKey(
                name: "fk_delivery_man_profiles_users_id",
                table: "delivery_man_profiles");

            migrationBuilder.DropIndex(
                name: "ix_meals_status",
                table: "meals");

            migrationBuilder.DropPrimaryKey(
                name: "pk_delivery_man_profiles",
                table: "delivery_man_profiles");

            migrationBuilder.DropPrimaryKey(
                name: "pk_chef_profiles",
                table: "chef_profiles");

            migrationBuilder.DropColumn(
                name: "archived_at",
                table: "meals");

            migrationBuilder.DropColumn(
                name: "status",
                table: "meals");

            migrationBuilder.AddColumn<bool>(
                name: "is_available",
                table: "meals",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "id",
                table: "delivery_man_profiles",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "id",
                table: "chef_profiles",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddPrimaryKey(
                name: "pk_delivery_man_profiles",
                table: "delivery_man_profiles",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_chef_profiles",
                table: "chef_profiles",
                column: "id");

            migrationBuilder.CreateIndex(
                name: "ix_delivery_man_profiles_user_id",
                table: "delivery_man_profiles",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_chef_profiles_user_id",
                table: "chef_profiles",
                column: "user_id",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_chef_profiles_users_user_id",
                table: "chef_profiles",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_delivery_man_profiles_users_user_id",
                table: "delivery_man_profiles",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");
        }
    }
}
