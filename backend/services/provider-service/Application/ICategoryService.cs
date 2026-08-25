using ProviderContracts;

namespace ProviderApplication;

public interface ICategoryService
{
    Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest request, CancellationToken cancellationToken);
    Task<CategoryResponse> UpdateCategoryAsync(Guid categoryId, UpdateCategoryRequest request, CancellationToken cancellationToken);
    Task<List<CategoryResponse>> GetAllCategoriesAsync(CancellationToken cancellationToken);
    Task<List<CategoryResponse>> GetAllCategoriesForAdminAsync(CancellationToken cancellationToken);
    Task<CategoryResponse> SetCategoryVisibilityAsync(Guid categoryId, bool isVisible, CancellationToken cancellationToken);
}
