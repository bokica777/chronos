using AuthDomain;
using Contracts;

namespace AuthContracts;

public sealed record RegisterUserRequest(string Email, string DisplayName, string Password, UserRole Role);
public sealed record LoginRequest(string Email, string Password);
public sealed record UserResponse(Guid Id, string Email, string DisplayName, UserRole Role, bool IsActive, DateTimeOffset CreatedAtUtc);
public sealed record LoginResponse(string AccessToken, DateTimeOffset ExpiresAtUtc, UserResponse User);
public sealed record UpdateUserRoleRequest(UserRole Role);
public sealed record UpdateUserActiveRequest(bool IsActive);
public sealed record UserRegistered : IntegrationEvent
{
    public required Guid UserId { get; init; }
    public required string Email { get; init; }
}
