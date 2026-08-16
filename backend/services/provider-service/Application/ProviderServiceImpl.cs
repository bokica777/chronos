using Messaging;
using ProviderContracts;
using ProviderDomain;

namespace ProviderApplication;

public sealed class ProviderServiceImpl(
    IProviderRepository providerRepository,
    IServiceRepository serviceRepository,
    IEventPublisher eventPublisher) : IProviderService
{
    public async Task<ProviderResponse> CreateProviderAsync(CreateProviderRequest request, CancellationToken cancellationToken)
    {
        var provider = new ProviderProfile(request.OwnerId, request.Name);
        provider.UpdateDescription(request.Description);
        provider.UpdateImage(request.ImageUrl);
        provider.UpdateLocation(request.Address, request.Latitude, request.Longitude);

        await providerRepository.AddAsync(provider, cancellationToken);
        await providerRepository.SaveChangesAsync(cancellationToken);

        await eventPublisher.PublishAsync(new ProviderCreated
        {
            ProviderId = provider.Id,
            Name = provider.Name
        }, cancellationToken);

        return ToResponse(provider);
    }

    public async Task<ProviderResponse> GetProviderAsync(Guid providerId, CancellationToken cancellationToken)
    {
        var provider = await providerRepository.FindByIdAsync(providerId, cancellationToken)
            ?? throw new KeyNotFoundException($"Provider {providerId} was not found.");

        return ToResponse(provider);
    }

    public async Task<List<ProviderResponse>> GetAllProvidersAsync(CancellationToken cancellationToken)
    {
        var providers = await providerRepository.GetAllAsync(cancellationToken);
        return providers.Select(ToResponse).ToList();
    }

    public async Task<ProviderResponse> GetOrCreateMyProviderAsync(Guid ownerId, string displayName, CancellationToken cancellationToken)
    {
        var existing = await providerRepository.FindByOwnerIdAsync(ownerId, cancellationToken);
        if (existing is not null)
        {
            return ToResponse(existing);
        }

        var provider = new ProviderProfile(ownerId, displayName);

        await providerRepository.AddAsync(provider, cancellationToken);
        await providerRepository.SaveChangesAsync(cancellationToken);

        await eventPublisher.PublishAsync(new ProviderCreated
        {
            ProviderId = provider.Id,
            Name = provider.Name
        }, cancellationToken);

        return ToResponse(provider);
    }

    public async Task<ProviderResponse> UpdateMyProviderAsync(Guid ownerId, UpdateProviderRequest request, CancellationToken cancellationToken)
    {
        var provider = await providerRepository.FindByOwnerIdAsync(ownerId, cancellationToken)
            ?? throw new KeyNotFoundException("Provider profile was not found for the current user.");

        provider.Rename(request.Name);
        provider.UpdateDescription(request.Description);
        provider.UpdateAboutUs(request.AboutUs);
        provider.UpdateImage(request.ImageUrl);
        provider.UpdateLocation(request.Address, request.Latitude, request.Longitude);
        provider.UpdateContact(request.ContactPhone, request.ContactEmail);
        provider.UpdateWorkingHours(request.WorkingHoursStart, request.WorkingHoursEnd);

        await providerRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(provider);
    }

    public async Task<ProviderResponse> UpdateMyImageAsync(Guid ownerId, string imageUrl, CancellationToken cancellationToken)
    {
        var provider = await providerRepository.FindByOwnerIdAsync(ownerId, cancellationToken)
            ?? throw new KeyNotFoundException("Provider profile was not found for the current user.");

        provider.UpdateImage(imageUrl);
        await providerRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(provider);
    }

    public async Task<ProviderResponse> SetMyVisibilityAsync(Guid ownerId, bool isVisible, CancellationToken cancellationToken)
    {
        var provider = await providerRepository.FindByOwnerIdAsync(ownerId, cancellationToken)
            ?? throw new KeyNotFoundException("Provider profile was not found for the current user.");

        if (isVisible)
        {
            provider.Activate();
        }
        else
        {
            provider.Deactivate();
        }

        await providerRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(provider);
    }

    public async Task DeleteMyProviderAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        var provider = await providerRepository.FindByOwnerIdAsync(ownerId, cancellationToken)
            ?? throw new KeyNotFoundException("Provider profile was not found for the current user.");

        var services = await serviceRepository.GetServicesByProviderIdAsync(provider.Id, cancellationToken);
        foreach (var service in services)
        {
            serviceRepository.RemoveService(service);
        }

        providerRepository.Remove(provider);

        await providerRepository.SaveChangesAsync(cancellationToken);
    }

    private static ProviderResponse ToResponse(ProviderProfile provider) =>
        new(
            provider.Id,
            provider.OwnerId,
            provider.Name,
            provider.Description,
            provider.AboutUs,
            provider.ImageUrl,
            provider.Address,
            provider.Latitude,
            provider.Longitude,
            provider.ContactPhone,
            provider.ContactEmail,
            provider.WorkingHoursStart,
            provider.WorkingHoursEnd,
            provider.IsActive);
}
