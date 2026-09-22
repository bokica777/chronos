using Messaging;
using Moq;
using ProviderApplication;
using ProviderContracts;
using ProviderDomain;
using Xunit;

namespace ProviderService.Tests;

public class ProviderServiceImplTests
{
    private readonly Mock<IProviderRepository> _providerRepository = new();
    private readonly Mock<IServiceRepository> _serviceRepository = new();
    private readonly Mock<IEventPublisher> _eventPublisher = new();
    private readonly ProviderServiceImpl _sut;

    public ProviderServiceImplTests()
    {
        _sut = new ProviderServiceImpl(
            _providerRepository.Object,
            _serviceRepository.Object,
            _eventPublisher.Object);
    }

    [Fact]
    public async Task GetOrCreateMyProviderAsync_ExistingProvider_ReturnsExistingWithoutCreatingNew()
    {
        var ownerId = Guid.NewGuid();
        var existing = new ProviderProfile(ownerId, "Postojeci Salon");
        _providerRepository
            .Setup(r => r.FindByOwnerIdAsync(ownerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var result = await _sut.GetOrCreateMyProviderAsync(ownerId, "Novi Naziv", CancellationToken.None);

        Assert.Equal(existing.Id, result.Id);
        Assert.Equal("Postojeci Salon", result.Name);
        _providerRepository.Verify(r => r.AddAsync(It.IsAny<ProviderProfile>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetOrCreateMyProviderAsync_NoExistingProvider_CreatesNewAndPublishesEvent()
    {
        var ownerId = Guid.NewGuid();
        _providerRepository
            .Setup(r => r.FindByOwnerIdAsync(ownerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((ProviderProfile?)null);

        var result = await _sut.GetOrCreateMyProviderAsync(ownerId, "Novi Salon", CancellationToken.None);

        Assert.Equal("Novi Salon", result.Name);
        _providerRepository.Verify(r => r.AddAsync(It.IsAny<ProviderProfile>(), It.IsAny<CancellationToken>()), Times.Once);
        _eventPublisher.Verify(
            p => p.PublishAsync(It.Is<ProviderCreated>(e => e.Name == "Novi Salon"), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateMyProviderAsync_NoProviderForOwner_ThrowsKeyNotFoundException()
    {
        var ownerId = Guid.NewGuid();
        _providerRepository
            .Setup(r => r.FindByOwnerIdAsync(ownerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((ProviderProfile?)null);

        var request = new UpdateProviderRequest("Salon", null, null, null, null, null, null, null, null, null, null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => _sut.UpdateMyProviderAsync(ownerId, request, CancellationToken.None));
    }

    [Fact]
    public async Task UpdateMyProviderAsync_OwnedProvider_UpdatesFields()
    {
        var ownerId = Guid.NewGuid();
        var provider = new ProviderProfile(ownerId, "Stari Naziv");
        _providerRepository
            .Setup(r => r.FindByOwnerIdAsync(ownerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(provider);

        var request = new UpdateProviderRequest(
            "Novi Naziv", "Opis", "O nama", null, "Adresa 1", 45.25, 19.84, "0601234567", "kontakt@salon.rs", "08:00", "16:00");

        var result = await _sut.UpdateMyProviderAsync(ownerId, request, CancellationToken.None);

        Assert.Equal("Novi Naziv", result.Name);
        Assert.Equal("Opis", result.Description);
        Assert.Equal("kontakt@salon.rs", result.ContactEmail);
        _providerRepository.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SetProviderVisibilityForAdminAsync_UnknownProvider_ThrowsKeyNotFoundException()
    {
        var providerId = Guid.NewGuid();
        _providerRepository
            .Setup(r => r.FindByIdAsync(providerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((ProviderProfile?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _sut.SetProviderVisibilityForAdminAsync(providerId, false, CancellationToken.None));
    }

    [Fact]
    public async Task DeleteMyProviderAsync_RemovesProviderAndItsServices()
    {
        var ownerId = Guid.NewGuid();
        var provider = new ProviderProfile(ownerId, "Salon Za Brisanje");
        var services = new List<Service>
        {
            new(provider.Id, Guid.NewGuid(), "Sisanje", null, null, 30, 1000m),
            new(provider.Id, Guid.NewGuid(), "Brijanje", null, null, 20, 700m),
        };

        _providerRepository
            .Setup(r => r.FindByOwnerIdAsync(ownerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(provider);
        _serviceRepository
            .Setup(r => r.GetServicesByProviderIdAsync(provider.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(services);

        await _sut.DeleteMyProviderAsync(ownerId, CancellationToken.None);

        _serviceRepository.Verify(r => r.RemoveService(It.IsAny<Service>()), Times.Exactly(2));
        _providerRepository.Verify(r => r.Remove(provider), Times.Once);
        _providerRepository.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
