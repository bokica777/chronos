using ProviderDomain;

namespace ProviderApplication;

public interface IServiceRepository
{
    Task<Service?> FindServiceByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<List<Service>> GetServicesByProviderIdAsync(Guid providerId, CancellationToken cancellationToken);
    Task<List<Service>> GetAllActivePublicServicesAsync(CancellationToken cancellationToken);
    Task AddServiceAsync(Service service, CancellationToken cancellationToken);
    void RemoveService(Service service);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
