using Messaging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ProviderApplication;

namespace ProviderInfrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Connection string 'Database' is missing.");

        services.AddDbContext<ProviderDbContext>(options => options.UseSqlServer(connectionString));
        services.AddScoped<IProviderRepository>(provider => provider.GetRequiredService<ProviderDbContext>());
        services.AddSingleton<IEventPublisher, DevelopmentEventPublisher>();
        return services;
    }
}
