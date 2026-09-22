using AuthApplication;
using AuthContracts;
using AuthDomain;
using Messaging;
using Microsoft.AspNetCore.Identity;
using Moq;
using Xunit;

namespace AuthService.Tests;

public class AuthServiceImplTests
{
    private readonly Mock<IUserRepository> _userRepository = new();
    private readonly Mock<IPasswordHasher<User>> _passwordHasher = new();
    private readonly Mock<ITokenGenerator> _tokenGenerator = new();
    private readonly Mock<IEventPublisher> _eventPublisher = new();
    private readonly AuthServiceImpl _sut;

    public AuthServiceImplTests()
    {
        _sut = new AuthServiceImpl(
            _userRepository.Object,
            _passwordHasher.Object,
            _tokenGenerator.Object,
            _eventPublisher.Object);
    }

    [Fact]
    public async Task RegisterAsync_AdminRole_ThrowsArgumentException()
    {
        var request = new RegisterUserRequest("admin@chronos.rs", "Admin", "Passw0rd!", UserRole.Admin);

        await Assert.ThrowsAsync<ArgumentException>(() => _sut.RegisterAsync(request, CancellationToken.None));

        _userRepository.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RegisterAsync_EmailAlreadyTaken_ThrowsInvalidOperationException()
    {
        var request = new RegisterUserRequest("client@chronos.rs", "Klijent", "Passw0rd!", UserRole.Client);
        _userRepository
            .Setup(r => r.FindByEmailAsync(request.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User(request.Email, "Postojeci", UserRole.Client));

        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.RegisterAsync(request, CancellationToken.None));

        _userRepository.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RegisterAsync_NewEmail_AddsUserAndPublishesEvent()
    {
        var request = new RegisterUserRequest("novi@chronos.rs", "Novi Korisnik", "Passw0rd!", UserRole.Client);
        _userRepository
            .Setup(r => r.FindByEmailAsync(request.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _passwordHasher
            .Setup(h => h.HashPassword(It.IsAny<User>(), request.Password))
            .Returns("hashed-password");

        var result = await _sut.RegisterAsync(request, CancellationToken.None);

        Assert.Equal(request.Email, result.Email);
        Assert.Equal(UserRole.Client, result.Role);
        _userRepository.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
        _userRepository.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _eventPublisher.Verify(
            p => p.PublishAsync(It.Is<UserRegistered>(e => e.Email == request.Email), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task LoginAsync_UnknownEmail_ThrowsKeyNotFoundException()
    {
        var request = new LoginRequest("nepostojeci@chronos.rs", "Passw0rd!");
        _userRepository
            .Setup(r => r.FindByEmailAsync(request.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => _sut.LoginAsync(request, CancellationToken.None));
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsUnauthorizedAccessException()
    {
        var user = new User("client@chronos.rs", "Klijent", UserRole.Client);
        user.SetPassword("hashed-password");
        var request = new LoginRequest(user.Email, "PogresnaLozinka");

        _userRepository
            .Setup(r => r.FindByEmailAsync(request.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _passwordHasher
            .Setup(h => h.VerifyHashedPassword(user, user.PasswordHash, request.Password))
            .Returns(PasswordVerificationResult.Failed);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _sut.LoginAsync(request, CancellationToken.None));
    }

    [Fact]
    public async Task LoginAsync_DeactivatedAccount_ThrowsUnauthorizedAccessException()
    {
        var user = new User("client@chronos.rs", "Klijent", UserRole.Client);
        user.SetPassword("hashed-password");
        user.SetActive(false);
        var request = new LoginRequest(user.Email, "Passw0rd!");

        _userRepository
            .Setup(r => r.FindByEmailAsync(request.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _passwordHasher
            .Setup(h => h.VerifyHashedPassword(user, user.PasswordHash, request.Password))
            .Returns(PasswordVerificationResult.Success);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _sut.LoginAsync(request, CancellationToken.None));
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsAccessToken()
    {
        var user = new User("client@chronos.rs", "Klijent", UserRole.Client);
        user.SetPassword("hashed-password");
        var request = new LoginRequest(user.Email, "Passw0rd!");
        var expiresAt = DateTimeOffset.UtcNow.AddHours(1);

        _userRepository
            .Setup(r => r.FindByEmailAsync(request.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _passwordHasher
            .Setup(h => h.VerifyHashedPassword(user, user.PasswordHash, request.Password))
            .Returns(PasswordVerificationResult.Success);
        _tokenGenerator
            .Setup(t => t.GenerateToken(user.Id, user.Email, user.DisplayName, user.Role))
            .Returns(("jwt-token", expiresAt));

        var result = await _sut.LoginAsync(request, CancellationToken.None);

        Assert.Equal("jwt-token", result.AccessToken);
        Assert.Equal(expiresAt, result.ExpiresAtUtc);
        Assert.Equal(user.Email, result.User.Email);
    }
}
