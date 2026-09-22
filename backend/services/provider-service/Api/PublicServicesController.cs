using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProviderApplication;
using ProviderContracts;

namespace ProviderApi;

[ApiController]
[Route("api/v1/services")]
public sealed class PublicServicesController(IServiceCatalogService serviceCatalogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ServiceResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var result = await serviceCatalogService.GetAllPublicServicesAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ServiceResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        var result = await serviceCatalogService.GetPublicServiceAsync(id, cancellationToken);
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin")]
    public async Task<ActionResult<List<ServiceResponse>>> GetAllForAdmin(CancellationToken cancellationToken)
    {
        var result = await serviceCatalogService.GetAllServicesForAdminAsync(cancellationToken);
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("{id:guid}/visibility")]
    public async Task<ActionResult<ServiceResponse>> SetVisibilityForAdmin(Guid id, SetVisibilityRequest request, CancellationToken cancellationToken)
    {
        var result = await serviceCatalogService.SetServiceVisibilityForAdminAsync(id, request.IsVisible, cancellationToken);
        return Ok(result);
    }
}
