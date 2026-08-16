using ProviderContracts;

namespace ProviderApplication;

public interface IProviderService
{
    Task<ProviderResponse> CreateProviderAsync(CreateProviderRequest request, CancellationToken cancellationToken);
    Task<ProviderResponse> GetProviderAsync(Guid providerId, CancellationToken cancellationToken);
    Task<List<ProviderResponse>> GetAllProvidersAsync(CancellationToken cancellationToken);
    Task<ProviderResponse> GetOrCreateMyProviderAsync(Guid ownerId, string displayName, CancellationToken cancellationToken);
    Task<ProviderResponse> UpdateMyProviderAsync(Guid ownerId, UpdateProviderRequest request, CancellationToken cancellationToken);
    Task<ProviderResponse> UpdateMyImageAsync(Guid ownerId, string imageUrl, CancellationToken cancellationToken);
    Task<ProviderResponse> SetMyVisibilityAsync(Guid ownerId, bool isVisible, CancellationToken cancellationToken);
    Task DeleteMyProviderAsync(Guid ownerId, CancellationToken cancellationToken);
}
