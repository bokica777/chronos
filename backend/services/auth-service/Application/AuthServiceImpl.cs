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

        return ToResponse(user);
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

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("This account has been deactivated.");
        }

        var (token, expiresAtUtc) = tokenGenerator.GenerateToken(user.Id, user.Email, user.DisplayName, user.Role);
        return new LoginResponse(token, expiresAtUtc, ToResponse(user));
    }

    public async Task<List<UserResponse>> GetAllUsersAsync(CancellationToken cancellationToken)
    {
        var users = await userRepository.GetAllAsync(cancellationToken);
        return users.Select(ToResponse).ToList();
    }

    public async Task<UserResponse> UpdateUserRoleAsync(Guid userId, UserRole role, CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException($"User {userId} was not found.");

        user.SetRole(role);
        await userRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(user);
    }

    public async Task<UserResponse> SetUserActiveAsync(Guid userId, bool isActive, CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException($"User {userId} was not found.");

        user.SetActive(isActive);
        await userRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(user);
    }

    public async Task<UserResponse> GetMyProfileAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException($"User {userId} was not found.");

        return ToResponse(user);
    }

    public async Task<UserResponse> UpdateMyProfileAsync(Guid userId, string? phoneNumber, CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException($"User {userId} was not found.");

        user.UpdatePhoneNumber(phoneNumber);
        await userRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(user);
    }

    public async Task<UserResponse> UpdateMyImageAsync(Guid userId, string imageUrl, CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException($"User {userId} was not found.");

        user.UpdateImage(imageUrl);
        await userRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(user);
    }

    private static UserResponse ToResponse(User user) =>
        new(user.Id, user.Email, user.DisplayName, user.Role, user.IsActive, user.CreatedAtUtc, user.PhoneNumber, user.ImageUrl);
}
