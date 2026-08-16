using System.Text;
using System.Text.Json.Serialization;
using AuthApplication;
using AuthDomain;
using AuthInfrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Observability;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
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
app.UseChronosObservability();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => new { service = "auth", version = "1.0.0" });

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
