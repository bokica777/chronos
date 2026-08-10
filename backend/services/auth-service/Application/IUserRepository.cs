using AuthDomain;

namespace AuthApplication;

public interface IUserRepository
{
    Task<User?> FindByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken);
    Task AddAsync(User user, CancellationToken cancellationToken);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
