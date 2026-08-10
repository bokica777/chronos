using ProviderDomain;

namespace ProviderApplication;

public interface IProviderRepository
{
    Task<ProviderProfile?> FindByIdAsync(Guid id, CancellationToken cancellationToken);
    Task AddAsync(ProviderProfile provider, CancellationToken cancellationToken);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
