using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentApplication;
using PaymentContracts;

namespace PaymentApi;

// Sve rute zahtevaju prijavljenog korisnika - payment-service ne zna cija je
// rezervacija (to zna samo booking-service), pa se ovde ne proverava vlasnistvo,
// samo da je pozivalac ulogovan. Front nikad ne poziva ove rute za tudju rezervaciju.
[ApiController]
[Route("api/v1/payments")]
[Authorize]
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

    // Front ovim proverava da li vec postoji (i u kom je statusu) placanje za
    // datu rezervaciju - 404 znaci da placanje jos nije ni pokrenuto.
    [HttpGet("booking/{bookingId:guid}")]
    public async Task<ActionResult<PaymentResponse>> GetForBooking(Guid bookingId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await paymentService.GetPaymentForBookingAsync(bookingId, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // Admin pregled svih uplata na platformi - konzistentno sa ostalim admin
    // "/admin/..." rutama u ostalim servisima.
    [Authorize(Roles = "Admin")]
    [HttpGet("admin/all")]
    public async Task<ActionResult<List<PaymentResponse>>> GetAllForAdmin(CancellationToken cancellationToken)
    {
        var result = await paymentService.GetAllPaymentsForAdminAsync(cancellationToken);
        return Ok(result);
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
