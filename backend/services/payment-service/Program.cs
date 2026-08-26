using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Observability;
using PaymentApplication;
using PaymentInfrastructure;
using Stripe;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddChronosObservability();

// Test (sandbox) Stripe kljuc - vidi appsettings.Development.json. Jedan
// StripeClient se deli za ceo servis (thread-safe, preporuceno od Stripe-a).
var stripeSecretKey = builder.Configuration["Stripe:SecretKey"]
    ?? throw new InvalidOperationException("Stripe:SecretKey is missing.");
builder.Services.AddSingleton(new StripeClient(stripeSecretKey));

// Isti deljeni HMAC kljuc kao auth-service/provider-service/booking-service -
// nezavisna provera tokena, bez poziva ka auth-service-u.
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
app.MapGet("/", () => new { service = "payment", version = "1.0.0" });
app.Run();

public partial class Program;
