using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace Observability;

public sealed class ChronosExceptionHandler(IWebHostEnvironment environment) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var statusCode = exception switch
        {
            KeyNotFoundException => StatusCodes.Status404NotFound,
            UnauthorizedAccessException => StatusCodes.Status401Unauthorized,
            InvalidOperationException => StatusCodes.Status409Conflict,
            ArgumentException => StatusCodes.Status400BadRequest,
            _ => StatusCodes.Status500InternalServerError
        };

        httpContext.Response.StatusCode = statusCode;

        var message = statusCode != StatusCodes.Status500InternalServerError
            ? exception.Message
            : environment.IsDevelopment()
                ? exception.Message
                : "An unexpected error occurred. Please try again later.";

        await httpContext.Response.WriteAsJsonAsync(new { message }, cancellationToken);
        return true;
    }
}
