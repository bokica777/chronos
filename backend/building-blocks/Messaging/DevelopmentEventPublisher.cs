using Contracts;
using Microsoft.Extensions.Logging;

namespace Messaging;

public sealed class DevelopmentEventPublisher(ILogger<DevelopmentEventPublisher> logger)
    : IEventPublisher
{
    public Task PublishAsync<TEvent>(
        TEvent message,
        CancellationToken cancellationToken = default)
        where TEvent : IntegrationEvent
    {
        logger.LogInformation(
            "Development publisher received {EventType} {EventId} with correlation {CorrelationId}",
            typeof(TEvent).Name,
            message.EventId,
            message.CorrelationId);

        return Task.CompletedTask;
    }
}
