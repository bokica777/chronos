using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Observability;
using ProviderApplication;
using ProviderDomain;
using ProviderInfrastructure;
using Security;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddChronosObservability();
builder.Services.AddChronosJwtAuthentication(builder.Configuration);

var app = builder.Build();

var webRootPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var uploadsPath = Path.Combine(webRootPath, "uploads", "providers");
Directory.CreateDirectory(uploadsPath);

app.UseChronosObservability();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(webRootPath),
});
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => new { service = "provider", version = "1.0.0" });

using (var migrationScope = app.Services.CreateScope())
{
    migrationScope.ServiceProvider.GetRequiredService<ProviderDbContext>().Database.Migrate();
}

await SeedCategoriesAsync(app.Services);

app.Run();

static async Task SeedCategoriesAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var categoryRepository = scope.ServiceProvider.GetRequiredService<ICategoryRepository>();

    var existing = await categoryRepository.GetAllCategoriesAsync(CancellationToken.None);
    if (existing.Count > 0)
    {
        return;
    }

    var defaults = new (string Name, string IconUrl)[]
    {
        ("Zdravlje", "/icons/zdravlje.svg"),
        ("Lepota i nega", "/icons/lepota.svg"),
        ("Fitnes i sport", "/icons/fitnes.svg"),
        ("Kućni majstori", "/icons/majstori.svg"),
        ("Auto servisi", "/icons/auto.svg"),
        ("Edukacija", "/icons/edukacija.svg"),
    };

    foreach (var (name, iconUrl) in defaults)
    {
        await categoryRepository.AddCategoryAsync(new Category(name, iconUrl), CancellationToken.None);
    }

    await categoryRepository.SaveChangesAsync(CancellationToken.None);
}

public partial class Program;
