using AuthApplication;
using Messaging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AuthInfrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Connection string 'Database' is missing.");

        services.AddDbContext<AuthDbContext>(options => options.UseSqlServer(connectionString));
        services.AddScoped<IUserRepository>(provider => provider.GetRequiredService<AuthDbContext>());
        services.AddSingleton<IEventPublisher, DevelopmentEventPublisher>();
        return services;
    }
}
