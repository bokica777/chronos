using Messaging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PaymentApplication;

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
        services.AddSingleton<IEventPublisher, DevelopmentEventPublisher>();
        return services;
    }
}
