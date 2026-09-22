using System.Security.Claims;
using AuthApplication;
using AuthContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;

namespace AuthApi;

[ApiController]
[Authorize]
[Route("api/v1/auth/me")]
public sealed class MeController(IAuthService authService, IWebHostEnvironment webHostEnvironment) : ControllerBase
{
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif"
    };

    [HttpGet]
    public async Task<ActionResult<UserResponse>> GetMine(CancellationToken cancellationToken)
    {
        var result = await authService.GetMyProfileAsync(GetCurrentUserId(), cancellationToken);
        return Ok(result);
    }

    [HttpPut]
    public async Task<ActionResult<UserResponse>> UpdateMine(UpdateMyProfileRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.UpdateMyProfileAsync(GetCurrentUserId(), request.PhoneNumber, cancellationToken);
        return Ok(result);
    }

    [HttpPost("image")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<UserResponse>> UploadMyImage(IFormFile file, CancellationToken cancellationToken)
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

        var uploadsFolder = Path.Combine(webHostEnvironment.ContentRootPath, "wwwroot", "uploads", "users");
        Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var imageUrl = $"/uploads/users/{fileName}";

        var result = await authService.UpdateMyImageAsync(GetCurrentUserId(), imageUrl, cancellationToken);
        return Ok(result);
    }

    private Guid GetCurrentUserId()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("Token is missing the user id claim.");
        return Guid.Parse(value);
    }
}
