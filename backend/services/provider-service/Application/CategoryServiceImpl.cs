using ProviderContracts;
using ProviderDomain;

namespace ProviderApplication;

public sealed class CategoryServiceImpl(ICategoryRepository categoryRepository) : ICategoryService
{
    public async Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        var category = new Category(request.Name, request.IconUrl);

        await categoryRepository.AddCategoryAsync(category, cancellationToken);
        await categoryRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(category);
    }

    public async Task<CategoryResponse> UpdateCategoryAsync(Guid categoryId, UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        var category = await categoryRepository.FindCategoryByIdAsync(categoryId, cancellationToken)
            ?? throw new KeyNotFoundException($"Category {categoryId} was not found.");

        category.Update(request.Name, request.IconUrl);
        await categoryRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(category);
    }

    public async Task<List<CategoryResponse>> GetAllCategoriesAsync(CancellationToken cancellationToken)
    {
        var categories = await categoryRepository.GetAllCategoriesAsync(cancellationToken);
        return categories.Select(ToResponse).ToList();
    }

    public async Task<List<CategoryResponse>> GetAllCategoriesForAdminAsync(CancellationToken cancellationToken)
    {
        var categories = await categoryRepository.GetAllCategoriesForAdminAsync(cancellationToken);
        return categories.Select(ToResponse).ToList();
    }

    public async Task<CategoryResponse> SetCategoryVisibilityAsync(Guid categoryId, bool isVisible, CancellationToken cancellationToken)
    {
        var category = await categoryRepository.FindCategoryByIdAsync(categoryId, cancellationToken)
            ?? throw new KeyNotFoundException($"Category {categoryId} was not found.");

        if (isVisible)
        {
            category.Activate();
        }
        else
        {
            category.Deactivate();
        }

        await categoryRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(category);
    }

    private static CategoryResponse ToResponse(Category category) =>
        new(category.Id, category.Name, category.IconUrl, category.IsActive);
}
