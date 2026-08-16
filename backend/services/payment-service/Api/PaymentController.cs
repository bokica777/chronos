using Microsoft.AspNetCore.Mvc;
using PaymentApplication;
using PaymentContracts;

namespace PaymentApi;

[ApiController]
[Route("api/v1/payments")]
public sealed class PaymentController(IPaymentService paymentService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<PaymentResponse>> Create(CreatePaymentRequest request, CancellationToken cancellationToken)
    {
        var result = await paymentService.CreatePaymentAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PaymentResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await paymentService.GetPaymentAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/complete")]
    public async Task<ActionResult<PaymentResponse>> Complete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await paymentService.CompletePaymentAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}
