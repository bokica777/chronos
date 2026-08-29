using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProviderService.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderWorkingHours : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WorkingHoursStart",
                table: "Providers",
                type: "nvarchar(5)",
                maxLength: 5,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkingHoursEnd",
                table: "Providers",
                type: "nvarchar(5)",
                maxLength: 5,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WorkingHoursStart",
                table: "Providers");

            migrationBuilder.DropColumn(
                name: "WorkingHoursEnd",
                table: "Providers");
        }
    }
}
