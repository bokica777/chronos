using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Observability;
using ProviderApplication;
using ProviderDomain;
using ProviderInfrastructure;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddChronosObservability();

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is missing.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

// Ne oslanjamo se na app.Environment.WebRootPath - ono je null dok wwwroot
// folder fizicki ne postoji na disku (a mi ga tek sad kreiramo), pa bismo
// dobili ArgumentNullException. Umesto toga racunamo putanju sami preko
// ContentRootPath i eksplicitno je prosledjujemo static files middleware-u.
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

await SeedCategoriesAsync(app.Services);

app.Run();

// Ubacuje pocetni skup kategorija (sa ikonicama) ako tabela jos nije
// popunjena - isti obrazac kao SeedAdminAsync u auth-service. Ikonice su
// staticki SVG fajlovi iz frontend/public/icons (transparentna pozadina),
// pa se serviraju direktno sa frontend hosta bez prolaska kroz Gateway.
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
