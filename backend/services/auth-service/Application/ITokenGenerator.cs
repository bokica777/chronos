using AuthDomain;

namespace AuthApplication;

public interface ITokenGenerator
{
    (string Token, DateTimeOffset ExpiresAtUtc) GenerateToken(Guid userId, string email, string displayName, UserRole role);
}
