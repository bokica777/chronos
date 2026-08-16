using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProviderService.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderContact : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactEmail",
                table: "Providers",
                type: "nvarchar(320)",
                maxLength: 320,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContactPhone",
                table: "Providers",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactEmail",
                table: "Providers");

            migrationBuilder.DropColumn(
                name: "ContactPhone",
                table: "Providers");
        }
    }
}
