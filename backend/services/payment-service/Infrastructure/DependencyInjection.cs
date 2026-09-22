using Messaging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using PaymentApplication;
using RabbitMQ.Client;

namespace PaymentInfrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Connection string 'Database' is missing.");

        services.AddDbContext<PaymentDbContext>(options => options.UseSqlServer(connectionString));
        services.AddScoped<IPaymentRepository>(provider => provider.GetRequiredService<PaymentDbContext>());
        services.AddScoped<IOutboxRepository>(provider => provider.GetRequiredService<PaymentDbContext>());
        services.AddSingleton<IEventPublisher, DevelopmentEventPublisher>();

        services.AddSingleton<IConnection>(_ =>
        {
            var rabbitSection = configuration.GetSection("RabbitMQ");
            var factory = new ConnectionFactory
            {
                HostName = rabbitSection["Host"] ?? "localhost",
                Port = rabbitSection.GetValue<int?>("Port") ?? 5672,
                UserName = rabbitSection["Username"] ?? "guest",
                Password = rabbitSection["Password"] ?? "guest"
            };
            return factory.CreateConnection();
        });
        services.AddHostedService<PaymentOutboxRelay>();

        return services;
    }
}
