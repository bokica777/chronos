using Microsoft.Extensions.DependencyInjection;

namespace ProviderApplication;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services) => services;
}
