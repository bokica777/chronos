using System.Text;
using Messaging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;

namespace PaymentInfrastructure;

public sealed class PaymentOutboxRelay(
    IServiceScopeFactory scopeFactory,
    IConnection rabbitConnection,
    ILogger<PaymentOutboxRelay> logger) : BackgroundService
{
    private const string ExchangeName = "payment.events";
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(2);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var channel = rabbitConnection.CreateModel();
        channel.ExchangeDeclare(ExchangeName, ExchangeType.Topic, durable: true);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PublishPendingMessagesAsync(channel, stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to relay outbox messages to RabbitMQ");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    private async Task PublishPendingMessagesAsync(IModel channel, CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var outboxRepository = scope.ServiceProvider.GetRequiredService<IOutboxRepository>();
        var dbContext = scope.ServiceProvider.GetRequiredService<PaymentDbContext>();

        var pending = await outboxRepository.GetPendingAsync(cancellationToken);
        if (pending.Count == 0)
        {
            return;
        }

        foreach (var message in pending)
        {
            var routingKey = message.Type switch
            {
                "PaymentCompleted" => "payment.completed",
                _ => "payment.unknown"
            };

            var body = Encoding.UTF8.GetBytes(message.Payload);
            channel.BasicPublish(ExchangeName, routingKey, body: body);
            message.MarkProcessed();

            logger.LogInformation("Published outbox message {MessageId} ({Type}) to {RoutingKey}", message.Id, message.Type, routingKey);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
