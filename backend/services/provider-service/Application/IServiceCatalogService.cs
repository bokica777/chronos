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
    Task<List<ServiceResponse>> GetAllServicesForAdminAsync(CancellationToken cancellationToken);
    Task<ServiceResponse> SetServiceVisibilityForAdminAsync(Guid serviceId, bool isVisible, CancellationToken cancellationToken);

    // v2 API ugovor (api/v2/services) - vraca ServiceResponseV2 sa ugradjenim
    // ProviderName/CategoryName, vidi napomenu uz ServiceResponseV2 u ServiceContracts.cs.
    Task<List<ServiceResponseV2>> GetAllPublicServicesV2Async(CancellationToken cancellationToken);
    Task<ServiceResponseV2> GetPublicServiceV2Async(Guid serviceId, CancellationToken cancellationToken);
}
