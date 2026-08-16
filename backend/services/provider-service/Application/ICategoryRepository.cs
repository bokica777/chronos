using ProviderDomain;

namespace ProviderApplication;

public interface ICategoryRepository
{
    Task<Category?> FindCategoryByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<List<Category>> GetAllCategoriesAsync(CancellationToken cancellationToken);
    Task AddCategoryAsync(Category category, CancellationToken cancellationToken);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
