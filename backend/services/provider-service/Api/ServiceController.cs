using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using ProviderApplication;
using ProviderContracts;

namespace ProviderApi;

[ApiController]
[Authorize(Roles = "Partner")]
[Route("api/v1/providers/me/services")]
public sealed class ServiceController(
    IServiceCatalogService serviceCatalogService,
    IProviderService providerService,
    IWebHostEnvironment webHostEnvironment) : ControllerBase
{
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif"
    };

    [HttpGet]
    public async Task<ActionResult<List<ServiceResponse>>> GetMine(CancellationToken cancellationToken)
    {
        var providerId = await ResolveProviderIdAsync(cancellationToken);
        var result = await serviceCatalogService.GetServicesByProviderAsync(providerId, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ServiceResponse>> Create(CreateServiceRequest request, CancellationToken cancellationToken)
    {
        var providerId = await ResolveProviderIdAsync(cancellationToken);
        var result = await serviceCatalogService.CreateServiceAsync(providerId, request, cancellationToken);
        return CreatedAtAction(nameof(GetMine), result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ServiceResponse>> Update(Guid id, UpdateServiceRequest request, CancellationToken cancellationToken)
    {
        var providerId = await ResolveProviderIdAsync(cancellationToken);
        try
        {
            var result = await serviceCatalogService.UpdateServiceAsync(providerId, id, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/image")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<ServiceResponse>> UploadImage(Guid id, IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file was uploaded." });
        }

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(extension) || !AllowedImageExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Only jpg, jpeg, png, webp or gif images are allowed." });
        }

        var uploadsFolder = Path.Combine(webHostEnvironment.ContentRootPath, "wwwroot", "uploads", "services");
        Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var imageUrl = $"/uploads/services/{fileName}";
        var providerId = await ResolveProviderIdAsync(cancellationToken);

        try
        {
            var result = await serviceCatalogService.UpdateServiceImageAsync(providerId, id, imageUrl, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var providerId = await ResolveProviderIdAsync(cancellationToken);
        try
        {
            await serviceCatalogService.DeleteServiceAsync(providerId, id, cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    private async Task<Guid> ResolveProviderIdAsync(CancellationToken cancellationToken)
    {
        var ownerId = GetOwnerId();
        var displayName = User.FindFirst("displayName")?.Value ?? "Partner";
        var provider = await providerService.GetOrCreateMyProviderAsync(ownerId, displayName, cancellationToken);
        return provider.Id;
    }

    private Guid GetOwnerId()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("Token is missing the user id claim.");
        return Guid.Parse(value);
    }
}
