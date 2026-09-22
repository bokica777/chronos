using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace Observability;

public static class ObservabilityExtensions
{
    public static IServiceCollection AddChronosObservability(this IServiceCollection services)
    {
        services.AddHealthChecks();
        services.AddProblemDetails();
        services.AddExceptionHandler<ChronosExceptionHandler>();
        return services;
    }

    public static WebApplication UseChronosObservability(this WebApplication app)
    {
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseExceptionHandler();
        app.MapHealthChecks("/health/live", new() { Predicate = _ => false });
        app.MapHealthChecks("/health/ready");
        return app;
    }
}
