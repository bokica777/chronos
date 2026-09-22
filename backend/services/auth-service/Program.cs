using System.Text.Json.Serialization;
using AuthApplication;
using AuthDomain;
using AuthInfrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Observability;
using Security;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddChronosObservability();
builder.Services.AddChronosJwtAuthentication(builder.Configuration);

var app = builder.Build();

var webRootPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var uploadsPath = Path.Combine(webRootPath, "uploads", "users");
Directory.CreateDirectory(uploadsPath);

app.UseChronosObservability();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(webRootPath),
});
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => new { service = "auth", version = "1.0.0" });

using (var migrationScope = app.Services.CreateScope())
{
    migrationScope.ServiceProvider.GetRequiredService<AuthDbContext>().Database.Migrate();
}

await SeedAdminAsync(app.Services);

app.Run();

static async Task SeedAdminAsync(IServiceProvider services)
{
    const string adminEmail = "admin@admin.com";
    const string adminPassword = "admin";

    using var scope = services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

    var adminExists = await dbContext.Users.AnyAsync(u => u.Email == adminEmail);
    if (adminExists)
    {
        return;
    }

    var admin = new User(adminEmail, "Admin", UserRole.Admin);
    admin.SetPassword(passwordHasher.HashPassword(admin, adminPassword));

    dbContext.Users.Add(admin);
    await dbContext.SaveChangesAsync();
}

public partial class Program;
