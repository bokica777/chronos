using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using ProviderApplication;
using ProviderContracts;

namespace ProviderApi;

[ApiController]
[Route("api/v1/categories")]
public sealed class CategoryController(ICategoryService categoryService, IWebHostEnvironment webHostEnvironment) : ControllerBase
{
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"
    };

    [HttpGet]
    public async Task<ActionResult<List<CategoryResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var result = await categoryService.GetAllCategoriesAsync(cancellationToken);
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<CategoryResponse>> Create(CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        var result = await categoryService.CreateCategoryAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetAll), result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CategoryResponse>> Update(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        var result = await categoryService.UpdateCategoryAsync(id, request, cancellationToken);
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin")]
    public async Task<ActionResult<List<CategoryResponse>>> GetAllForAdmin(CancellationToken cancellationToken)
    {
        var result = await categoryService.GetAllCategoriesForAdminAsync(cancellationToken);
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("{id:guid}/visibility")]
    public async Task<ActionResult<CategoryResponse>> SetVisibility(Guid id, SetVisibilityRequest request, CancellationToken cancellationToken)
    {
        var result = await categoryService.SetCategoryVisibilityAsync(id, request.IsVisible, cancellationToken);
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{id:guid}/image")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<CategoryResponse>> UploadImage(Guid id, IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file was uploaded." });
        }

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(extension) || !AllowedImageExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Only jpg, jpeg, png, webp, gif or svg images are allowed." });
        }

        var uploadsFolder = Path.Combine(webHostEnvironment.ContentRootPath, "wwwroot", "uploads", "categories");
        Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var iconUrl = $"/uploads/categories/{fileName}";
        var result = await categoryService.UpdateCategoryImageAsync(id, iconUrl, cancellationToken);
        return Ok(result);
    }
}
