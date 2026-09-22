using Moq;
using ProviderApplication;
using ProviderContracts;
using ProviderDomain;
using Xunit;

namespace ProviderService.Tests;

public class CategoryServiceImplTests
{
    private readonly Mock<ICategoryRepository> _categoryRepository = new();
    private readonly CategoryServiceImpl _sut;

    public CategoryServiceImplTests()
    {
        _sut = new CategoryServiceImpl(_categoryRepository.Object);
    }

    [Fact]
    public async Task UpdateCategoryAsync_UnknownCategory_ThrowsKeyNotFoundException()
    {
        var categoryId = Guid.NewGuid();
        _categoryRepository
            .Setup(r => r.FindCategoryByIdAsync(categoryId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Category?)null);

        var request = new UpdateCategoryRequest("Nova Kategorija", null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => _sut.UpdateCategoryAsync(categoryId, request, CancellationToken.None));
    }

    [Fact]
    public async Task UpdateCategoryAsync_ExistingCategory_UpdatesNameAndIcon()
    {
        var category = new Category("Stara", null);
        _categoryRepository
            .Setup(r => r.FindCategoryByIdAsync(category.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(category);

        var result = await _sut.UpdateCategoryAsync(category.Id, new UpdateCategoryRequest("Nova", "icon.png"), CancellationToken.None);

        Assert.Equal("Nova", result.Name);
        Assert.Equal("icon.png", result.IconUrl);
        _categoryRepository.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task SetCategoryVisibilityAsync_TogglesActiveState(bool isVisible)
    {
        var category = new Category("Frizerski Saloni", null);
        if (!isVisible)
        {
            category.Activate();
        }
        else
        {
            category.Deactivate();
        }

        _categoryRepository
            .Setup(r => r.FindCategoryByIdAsync(category.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(category);

        var result = await _sut.SetCategoryVisibilityAsync(category.Id, isVisible, CancellationToken.None);

        Assert.Equal(isVisible, result.IsActive);
    }
}
