using ProviderDomain;

namespace ProviderApplication;

public interface IProviderRepository
{
    Task<ProviderProfile?> FindByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<ProviderProfile?> FindByOwnerIdAsync(Guid ownerId, CancellationToken cancellationToken);
    Task<List<ProviderProfile>> GetAllAsync(CancellationToken cancellationToken);
    Task AddAsync(ProviderProfile provider, CancellationToken cancellationToken);
    void Remove(ProviderProfile provider);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
