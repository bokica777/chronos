using Observability;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddChronosObservability();
builder.Services.AddHttpClient();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? throw new InvalidOperationException("Allowed origins not configured.");

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddReverseProxy().LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();
app.UseChronosObservability();
app.UseCors("Frontend");

app.MapGet("/", () => Results.Ok(new
{
    service = "gateway",
    status = "running",
    note = "Frontend communicates only with this public entry point."
}));

app.MapReverseProxy();

app.Run();

public partial class Program;
