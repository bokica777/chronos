using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentApplication;
using PaymentContracts;
using Stripe;

namespace PaymentApi;

// Sve rute zahtevaju prijavljenog korisnika - payment-service ne zna cija je
// rezervacija (to zna samo booking-service), pa se ovde ne proverava vlasnistvo,
// samo da je pozivalac ulogovan. Front nikad ne poziva ove rute za tudju rezervaciju.
// Izuzetak je webhook ruta ispod - Stripe je spoljni pozivalac bez naseg JWT-a.
[ApiController]
[Route("api/v1/payments")]
[Authorize]
public sealed class PaymentController(IPaymentService paymentService, IConfiguration configuration) : ControllerBase
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

    // Pravi Stripe tok - front redirektuje korisnika na CheckoutUrl umesto da
    // odmah zove /complete.
    [HttpPost("{id:guid}/checkout-session")]
    public async Task<ActionResult<StripeCheckoutResponse>> CreateCheckoutSession(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await paymentService.CreateCheckoutSessionAsync(id, cancellationToken);
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

    // Poziva front kad se korisnik vrati sa Stripe-a na success_url - potvrdjuje
    // stanje odmah, bez cekanja na webhook.
    [HttpPost("{id:guid}/confirm-stripe")]
    public async Task<ActionResult<PaymentResponse>> ConfirmStripe(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await paymentService.ConfirmStripeSessionAsync(id, cancellationToken);
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

    // Stripe ovde salje POST bez ikakvog naseg JWT-a, pa mora [AllowAnonymous]
    // da presece [Authorize] sa nivoa kontrolera. Umesto JWT-a, autentičnost
    // poziva se dokazuje HMAC potpisom u "Stripe-Signature" headeru.
    [AllowAnonymous]
    [HttpPost("webhooks/stripe")]
    public async Task<IActionResult> StripeWebhook(CancellationToken cancellationToken)
    {
        var json = await new StreamReader(Request.Body).ReadToEndAsync(cancellationToken);
        var webhookSecret = configuration["Stripe:WebhookSecret"];

        if (string.IsNullOrEmpty(webhookSecret))
        {
            // Lokalno bez "stripe listen" nemamo webhook secret - ne mozemo
            // proveriti potpis, pa odbijamo umesto da prihvatimo neproverene pozive.
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, Request.Headers["Stripe-Signature"], webhookSecret);
        }
        catch (StripeException)
        {
            return BadRequest();
        }

        if (stripeEvent.Type == "checkout.session.completed" &&
            stripeEvent.Data.Object is Stripe.Checkout.Session session &&
            session.PaymentStatus == "paid")
        {
            try
            {
                await paymentService.CompletePaymentByStripeSessionAsync(session.Id, cancellationToken);
            }
            catch (KeyNotFoundException)
            {
                // Npr. test event poslat preko Stripe CLI-a bez odgovarajuceg
                // Payment-a u nasoj bazi - ne treba da Stripe ovo ponavlja zauvek.
            }
        }

        return Ok();
    }
}
