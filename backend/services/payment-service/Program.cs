using Microsoft.EntityFrameworkCore;
using Observability;
using PaymentApplication;
using PaymentInfrastructure;
using Security;
using Stripe;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddChronosObservability();
builder.Services.AddChronosJwtAuthentication(builder.Configuration);

var stripeSecretKey = builder.Configuration["Stripe:SecretKey"]
    ?? throw new InvalidOperationException("Stripe:SecretKey is missing.");
builder.Services.AddSingleton(new StripeClient(stripeSecretKey));

var app = builder.Build();
app.UseChronosObservability();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => new { service = "payment", version = "1.0.0" });

using (var migrationScope = app.Services.CreateScope())
{
    migrationScope.ServiceProvider.GetRequiredService<PaymentDbContext>().Database.Migrate();
}

app.Run();

public partial class Program;
