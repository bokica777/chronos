using Microsoft.AspNetCore.Mvc;
using ProviderApplication;
using ProviderContracts;

namespace ProviderApi;

// Demonstracija URL-based API verzionisanja: api/v2/services postoji paralelno
// sa api/v1/services (PublicServicesController) i namerno vraca drugaciji ugovor
// (ServiceResponseV2 sa ugradjenim ProviderName/CategoryName) - ne samo drugu putanju.
// v1 ostaje netaknut zbog postojecih klijenata (frontend i dalje koristi v1).
[ApiController]
[Route("api/v2/services")]
public sealed class PublicServicesV2Controller(IServiceCatalogService serviceCatalogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ServiceResponseV2>>> GetAll(CancellationToken cancellationToken)
    {
        var result = await serviceCatalogService.GetAllPublicServicesV2Async(cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ServiceResponseV2>> Get(Guid id, CancellationToken cancellationToken)
    {
        var result = await serviceCatalogService.GetPublicServiceV2Async(id, cancellationToken);
        return Ok(result);
    }
}
