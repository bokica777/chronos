using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using ProviderApplication;
using ProviderContracts;

namespace ProviderApi;

[ApiController]
[Route("api/v1/providers")]
public sealed class ProviderController(
    IProviderService providerService,
    IServiceCatalogService serviceCatalogService,
    IWebHostEnvironment webHostEnvironment) : ControllerBase
{
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif"
    };

    [HttpPost]
    public async Task<ActionResult<ProviderResponse>> Create(CreateProviderRequest request, CancellationToken cancellationToken)
    {
        var result = await providerService.CreateProviderAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<ProviderResponse>> GetMine(CancellationToken cancellationToken)
    {
        var ownerId = GetOwnerId();
        var displayName = User.FindFirst("displayName")?.Value ?? "Partner";
        var result = await providerService.GetOrCreateMyProviderAsync(ownerId, displayName, cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpPut("me")]
    public async Task<ActionResult<ProviderResponse>> UpdateMine(UpdateProviderRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await providerService.UpdateMyProviderAsync(GetOwnerId(), request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("me/image")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<ProviderResponse>> UploadMyImage(IFormFile file, CancellationToken cancellationToken)
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

        var uploadsFolder = Path.Combine(webHostEnvironment.ContentRootPath, "wwwroot", "uploads", "providers");
        Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var imageUrl = $"/uploads/providers/{fileName}";

        try
        {
            var result = await providerService.UpdateMyImageAsync(GetOwnerId(), imageUrl, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPatch("me/visibility")]
    public async Task<ActionResult<ProviderResponse>> SetMyVisibility(SetVisibilityRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await providerService.SetMyVisibilityAsync(GetOwnerId(), request.IsVisible, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpDelete("me")]
    public async Task<IActionResult> DeleteMine(CancellationToken cancellationToken)
    {
        try
        {
            await providerService.DeleteMyProviderAsync(GetOwnerId(), cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<ProviderResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var result = await providerService.GetAllProvidersAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProviderResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await providerService.GetProviderAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}/services")]
    public async Task<ActionResult<List<ServiceResponse>>> GetServices(Guid id, CancellationToken cancellationToken)
    {
        var result = await serviceCatalogService.GetPublicServicesByProviderAsync(id, cancellationToken);
        return Ok(result);
    }

    private Guid GetOwnerId()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("Token is missing the user id claim.");
        return Guid.Parse(value);
    }
}
