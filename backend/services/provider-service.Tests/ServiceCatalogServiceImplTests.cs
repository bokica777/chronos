using Moq;
using ProviderApplication;
using ProviderContracts;
using ProviderDomain;
using Xunit;

namespace ProviderService.Tests;

public class ServiceCatalogServiceImplTests
{
    private readonly Mock<IServiceRepository> _serviceRepository = new();
    private readonly Mock<IProviderRepository> _providerRepository = new();
    private readonly ServiceCatalogServiceImpl _sut;

    public ServiceCatalogServiceImplTests()
    {
        _sut = new ServiceCatalogServiceImpl(_serviceRepository.Object, _providerRepository.Object);
    }

    [Fact]
    public async Task UpdateServiceAsync_ServiceBelongsToAnotherProvider_ThrowsKeyNotFoundException()
    {
        var actualOwnerId = Guid.NewGuid();
        var otherProviderId = Guid.NewGuid();
        var service = new Service(actualOwnerId, Guid.NewGuid(), "Sisanje", null, null, 30, 1000m);
        _serviceRepository
            .Setup(r => r.FindServiceByIdAsync(service.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(service);

        var request = new UpdateServiceRequest(service.CategoryId, "Sisanje Deluxe", null, null, 45, 1500m);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _sut.UpdateServiceAsync(otherProviderId, service.Id, request, CancellationToken.None));
    }

    [Fact]
    public async Task UpdateServiceAsync_OwnedService_UpdatesFields()
    {
        var providerId = Guid.NewGuid();
        var service = new Service(providerId, Guid.NewGuid(), "Sisanje", null, null, 30, 1000m);
        _serviceRepository
            .Setup(r => r.FindServiceByIdAsync(service.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(service);

        var request = new UpdateServiceRequest(service.CategoryId, "Sisanje Deluxe", "Opis", "Napomena", 45, 1500m);

        var result = await _sut.UpdateServiceAsync(providerId, service.Id, request, CancellationToken.None);

        Assert.Equal("Sisanje Deluxe", result.Name);
        Assert.Equal(1500m, result.Price);
        _serviceRepository.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteServiceAsync_ServiceBelongsToAnotherProvider_ThrowsKeyNotFoundException()
    {
        var actualOwnerId = Guid.NewGuid();
        var otherProviderId = Guid.NewGuid();
        var service = new Service(actualOwnerId, Guid.NewGuid(), "Sisanje", null, null, 30, 1000m);
        _serviceRepository
            .Setup(r => r.FindServiceByIdAsync(service.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(service);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _sut.DeleteServiceAsync(otherProviderId, service.Id, CancellationToken.None));

        _serviceRepository.Verify(r => r.RemoveService(It.IsAny<Service>()), Times.Never);
    }

    [Fact]
    public async Task GetPublicServiceAsync_InactiveService_ThrowsKeyNotFoundException()
    {
        var service = new Service(Guid.NewGuid(), Guid.NewGuid(), "Manikir", null, null, 30, 800m);
        service.Deactivate();
        _serviceRepository
            .Setup(r => r.FindServiceByIdAsync(service.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(service);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => _sut.GetPublicServiceAsync(service.Id, CancellationToken.None));
    }

    [Fact]
    public async Task GetPublicServiceAsync_ProviderDeactivated_ThrowsKeyNotFoundException()
    {
        var provider = new ProviderProfile(Guid.NewGuid(), "Salon");
        provider.Deactivate();
        var service = new Service(provider.Id, Guid.NewGuid(), "Manikir", null, null, 30, 800m);

        _serviceRepository
            .Setup(r => r.FindServiceByIdAsync(service.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(service);
        _providerRepository
            .Setup(r => r.FindByIdAsync(provider.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(provider);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => _sut.GetPublicServiceAsync(service.Id, CancellationToken.None));
    }

    [Fact]
    public async Task GetPublicServiceAsync_ActiveServiceAndProvider_ReturnsService()
    {
        var provider = new ProviderProfile(Guid.NewGuid(), "Salon");
        var service = new Service(provider.Id, Guid.NewGuid(), "Manikir", null, null, 30, 800m);

        _serviceRepository
            .Setup(r => r.FindServiceByIdAsync(service.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(service);
        _providerRepository
            .Setup(r => r.FindByIdAsync(provider.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(provider);

        var result = await _sut.GetPublicServiceAsync(service.Id, CancellationToken.None);

        Assert.Equal(service.Id, result.Id);
    }
}
