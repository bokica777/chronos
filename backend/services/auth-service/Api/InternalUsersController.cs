using AuthApplication;
using AuthContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthApi;

// Interni endpoint za servis-servis komunikaciju: notification-service ga zove
// da bi za customerId iz dogadjaja dobio ime, mejl i telefon kupca (za mejl
// potvrde kupcu i podatke o kupcu u mejlu partneru).
//
// Namerno NIJE rutiran kroz Gateway (Gateway prosledjuje samo /api/v1/auth/**),
// pa spolja nije dostupan; dodatno se trazi deljeni kljuc u X-Internal-Key
// zaglavlju (Internal:ApiKey), da ga ne bi mogao pozvati bilo ko u mrezi.
[ApiController]
[AllowAnonymous]
[Route("internal/users")]
public sealed class InternalUsersController(IAuthService authService, IConfiguration configuration) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserContactResponse>> GetContact(Guid id, CancellationToken cancellationToken)
    {
        var expectedKey = configuration["Internal:ApiKey"];
        if (string.IsNullOrEmpty(expectedKey) || Request.Headers["X-Internal-Key"] != expectedKey)
        {
            return Unauthorized();
        }

        var user = await authService.GetMyProfileAsync(id, cancellationToken);
        return Ok(new UserContactResponse(user.Id, user.Email, user.DisplayName, user.PhoneNumber));
    }
}
