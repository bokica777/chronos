using ProviderContracts;

namespace ProviderApplication;

public interface ICategoryService
{
    Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest request, CancellationToken cancellationToken);
    Task<CategoryResponse> UpdateCategoryAsync(Guid categoryId, UpdateCategoryRequest request, CancellationToken cancellationToken);
    Task<List<CategoryResponse>> GetAllCategoriesAsync(CancellationToken cancellationToken);
}
