using Observability;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddChronosObservability();
builder.Services.AddHttpClient();

var app = builder.Build();
app.UseChronosObservability();

app.MapGet("/", () => Results.Ok(new
{
    service = "gateway",
    status = "running",
    note = "Frontend communicates only with this public entry point."
}));

// YARP reverse-proxy routes are added after the first API contracts are fixed.
// The gateway must contain no business logic.
app.Run();

public partial class Program;
