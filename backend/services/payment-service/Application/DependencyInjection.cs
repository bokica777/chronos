using Microsoft.Extensions.DependencyInjection;

namespace PaymentApplication;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services) =>
        services.AddScoped<IPaymentService, PaymentServiceImpl>();
}
