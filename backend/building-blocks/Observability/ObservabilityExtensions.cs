using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Observability;

public static class ObservabilityExtensions
{
    public static IServiceCollection AddChronosObservability(this IServiceCollection services)
    {
        services.AddHealthChecks();
        services.AddProblemDetails();
        return services;
    }

    public static WebApplication UseChronosObservability(this WebApplication app)
    {
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseExceptionHandler(errorApp =>
        {
            errorApp.Run(async context =>
            {
                var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
                var problem = new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "Unexpected server error",
                    Detail = app.Environment.IsDevelopment() ? exception?.Message : null,
                    Instance = context.Request.Path
                };
                problem.Extensions["correlationId"] = context.TraceIdentifier;
                await Results.Problem(problem).ExecuteAsync(context);
            });
        });
        app.MapHealthChecks("/health/live", new() { Predicate = _ => false });
        app.MapHealthChecks("/health/ready");
        return app;
    }
}
