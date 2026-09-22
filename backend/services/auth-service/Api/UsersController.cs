using System.Security.Claims;
using AuthApplication;
using AuthContracts;
using AuthDomain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthApi;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/auth/users")]
public sealed class UsersController(IAuthService authService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<UserResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var result = await authService.GetAllUsersAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/role")]
    public async Task<ActionResult<UserResponse>> UpdateRole(Guid id, UpdateUserRoleRequest request, CancellationToken cancellationToken)
    {
        if (id == GetCurrentUserId())
        {
            return BadRequest(new { message = "You cannot change your own role." });
        }

        var result = await authService.UpdateUserRoleAsync(id, request.Role, cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/active")]
    public async Task<ActionResult<UserResponse>> SetActive(Guid id, UpdateUserActiveRequest request, CancellationToken cancellationToken)
    {
        if (id == GetCurrentUserId())
        {
            return BadRequest(new { message = "You cannot deactivate your own account." });
        }

        var result = await authService.SetUserActiveAsync(id, request.IsActive, cancellationToken);
        return Ok(result);
    }

    private Guid GetCurrentUserId()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("Token is missing the user id claim.");
        return Guid.Parse(value);
    }
}
