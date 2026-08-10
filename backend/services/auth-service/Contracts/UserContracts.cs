using Contracts;

namespace AuthContracts;

public sealed record RegisterUserRequest(string Email, string DisplayName, string Password);
public sealed record UserResponse(Guid Id, string Email, string DisplayName);
public sealed record UserRegistered : IntegrationEvent
{
    public required Guid UserId { get; init; }
    public required string Email { get; init; }
}
