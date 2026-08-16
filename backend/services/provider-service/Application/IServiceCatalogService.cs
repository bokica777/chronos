using ProviderContracts;

namespace ProviderApplication;

public interface IServiceCatalogService
{
    Task<ServiceResponse> CreateServiceAsync(Guid providerId, CreateServiceRequest request, CancellationToken cancellationToken);
    Task<ServiceResponse> UpdateServiceAsync(Guid providerId, Guid serviceId, UpdateServiceRequest request, CancellationToken cancellationToken);
    Task<ServiceResponse> UpdateServiceImageAsync(Guid providerId, Guid serviceId, string imageUrl, CancellationToken cancellationToken);
    Task DeleteServiceAsync(Guid providerId, Guid serviceId, CancellationToken cancellationToken);
    Task<List<ServiceResponse>> GetServicesByProviderAsync(Guid providerId, CancellationToken cancellationToken);
    Task<List<ServiceResponse>> GetPublicServicesByProviderAsync(Guid providerId, CancellationToken cancellationToken);
    Task<List<ServiceResponse>> GetAllPublicServicesAsync(CancellationToken cancellationToken);
    Task<ServiceResponse> GetPublicServiceAsync(Guid serviceId, CancellationToken cancellationToken);
}
