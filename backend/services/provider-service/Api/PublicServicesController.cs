using Microsoft.AspNetCore.Mvc;
using ProviderApplication;
using ProviderContracts;

namespace ProviderApi;

// Javna "pijaca usluga" - sve aktivne usluge svih vidljivih provajdera,
// bez auth. Odvojeno od ServiceController (koji je iskljucivo za
// ulogovanog partnera i njegove sopstvene usluge pod /providers/me/services).
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
        try
        {
            var result = await serviceCatalogService.GetPublicServiceAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
