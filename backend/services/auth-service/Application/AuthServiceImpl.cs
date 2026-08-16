using AuthContracts;
using AuthDomain;
using Messaging;
using Microsoft.AspNetCore.Identity;

namespace AuthApplication;

public sealed class AuthServiceImpl(
    IUserRepository userRepository,
    IPasswordHasher<User> passwordHasher,
    ITokenGenerator tokenGenerator,
    IEventPublisher eventPublisher) : IAuthService
{
    public async Task<UserResponse> RegisterAsync(RegisterUserRequest request, CancellationToken cancellationToken)
    {
        if (request.Role == UserRole.Admin)
        {
            throw new ArgumentException("The Admin role cannot be self-registered.");
        }

        var existing = await userRepository.FindByEmailAsync(request.Email, cancellationToken);
        if (existing is not null)
        {
            throw new InvalidOperationException("A user with this email already exists.");
        }

        var user = new User(request.Email, request.DisplayName, request.Role);
        user.SetPassword(passwordHasher.HashPassword(user, request.Password));

        await userRepository.AddAsync(user, cancellationToken);
        await userRepository.SaveChangesAsync(cancellationToken);

        await eventPublisher.PublishAsync(new UserRegistered
        {
            UserId = user.Id,
            Email = user.Email
        }, cancellationToken);

        return new UserResponse(user.Id, user.Email, user.DisplayName, user.Role);
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByEmailAsync(request.Email, cancellationToken)
            ?? throw new KeyNotFoundException("No account exists with this email.");

        var verification = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            throw new UnauthorizedAccessException("Incorrect password.");
        }

        var (token, expiresAtUtc) = tokenGenerator.GenerateToken(user.Id, user.Email, user.DisplayName, user.Role);
        return new LoginResponse(token, expiresAtUtc, new UserResponse(user.Id, user.Email, user.DisplayName, user.Role));
    }
}
