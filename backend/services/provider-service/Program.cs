using Observability;
using ProviderApplication;
using ProviderInfrastructure;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddChronosObservability();

var app = builder.Build();
app.UseChronosObservability();
app.MapControllers();
app.MapGet("/", () => new { service = "provider", version = "1.0.0" });
app.Run();

public partial class Program;
