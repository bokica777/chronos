using AuthContracts;
using AuthDomain;

namespace AuthApplication;

public interface IAuthService
{
    Task<UserResponse> RegisterAsync(RegisterUserRequest request, CancellationToken cancellationToken);
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<List<UserResponse>> GetAllUsersAsync(CancellationToken cancellationToken);
    Task<UserResponse> UpdateUserRoleAsync(Guid userId, UserRole role, CancellationToken cancellationToken);
    Task<UserResponse> SetUserActiveAsync(Guid userId, bool isActive, CancellationToken cancellationToken);
}
