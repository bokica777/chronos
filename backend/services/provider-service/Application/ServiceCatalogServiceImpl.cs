using ProviderContracts;
using ProviderDomain;

namespace ProviderApplication;

public sealed class ServiceCatalogServiceImpl(
    IServiceRepository serviceRepository,
    IProviderRepository providerRepository) : IServiceCatalogService
{
    public async Task<ServiceResponse> CreateServiceAsync(Guid providerId, CreateServiceRequest request, CancellationToken cancellationToken)
    {
        var service = new Service(providerId, request.CategoryId, request.Name, request.Description, request.Note, request.DurationMinutes, request.Price);

        await serviceRepository.AddServiceAsync(service, cancellationToken);
        await serviceRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(service);
    }

    public async Task<ServiceResponse> UpdateServiceAsync(Guid providerId, Guid serviceId, UpdateServiceRequest request, CancellationToken cancellationToken)
    {
        var service = await GetOwnedServiceAsync(providerId, serviceId, cancellationToken);

        service.Update(request.CategoryId, request.Name, request.Description, request.Note, request.DurationMinutes, request.Price);
        await serviceRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(service);
    }

    public async Task<ServiceResponse> UpdateServiceImageAsync(Guid providerId, Guid serviceId, string imageUrl, CancellationToken cancellationToken)
    {
        var service = await GetOwnedServiceAsync(providerId, serviceId, cancellationToken);

        service.UpdateImage(imageUrl);
        await serviceRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(service);
    }

    public async Task DeleteServiceAsync(Guid providerId, Guid serviceId, CancellationToken cancellationToken)
    {
        var service = await GetOwnedServiceAsync(providerId, serviceId, cancellationToken);

        serviceRepository.RemoveService(service);
        await serviceRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<ServiceResponse>> GetServicesByProviderAsync(Guid providerId, CancellationToken cancellationToken)
    {
        var services = await serviceRepository.GetServicesByProviderIdAsync(providerId, cancellationToken);
        return services.Select(ToResponse).ToList();
    }

    public async Task<List<ServiceResponse>> GetPublicServicesByProviderAsync(Guid providerId, CancellationToken cancellationToken)
    {
        var services = await serviceRepository.GetServicesByProviderIdAsync(providerId, cancellationToken);
        return services.Where(service => service.IsActive).Select(ToResponse).ToList();
    }

    public async Task<List<ServiceResponse>> GetAllPublicServicesAsync(CancellationToken cancellationToken)
    {
        var services = await serviceRepository.GetAllActivePublicServicesAsync(cancellationToken);
        return services.Select(ToResponse).ToList();
    }

    public async Task<ServiceResponse> GetPublicServiceAsync(Guid serviceId, CancellationToken cancellationToken)
    {
        var service = await serviceRepository.FindServiceByIdAsync(serviceId, cancellationToken);
        if (service is null || !service.IsActive)
        {
            throw new KeyNotFoundException($"Service {serviceId} was not found.");
        }

        var provider = await providerRepository.FindByIdAsync(service.ProviderId, cancellationToken);
        if (provider is null || !provider.IsActive)
        {
            throw new KeyNotFoundException($"Service {serviceId} was not found.");
        }

        return ToResponse(service);
    }

    private async Task<Service> GetOwnedServiceAsync(Guid providerId, Guid serviceId, CancellationToken cancellationToken)
    {
        var service = await serviceRepository.FindServiceByIdAsync(serviceId, cancellationToken);
        if (service is null || service.ProviderId != providerId)
        {
            throw new KeyNotFoundException($"Service {serviceId} was not found.");
        }

        return service;
    }

    private static ServiceResponse ToResponse(Service service) =>
        new(
            service.Id,
            service.ProviderId,
            service.CategoryId,
            service.Name,
            service.Description,
            service.Note,
            service.ImageUrl,
            service.DurationMinutes,
            service.Price,
            service.IsActive);
}
