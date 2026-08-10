using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Observability;

public sealed class CorrelationIdMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-Correlation-ID";

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers[HeaderName].FirstOrDefault()
            ?? Guid.NewGuid().ToString("N");

        context.TraceIdentifier = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        using (context.RequestServices
            .GetRequiredService<ILogger<CorrelationIdMiddleware>>()
            .BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
        {
            await next(context);
        }
    }
}
