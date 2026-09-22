using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentApplication;
using PaymentContracts;
using Stripe;

namespace PaymentApi;

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
        var result = await paymentService.GetPaymentAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpGet("booking/{bookingId:guid}")]
    public async Task<ActionResult<PaymentResponse>> GetForBooking(Guid bookingId, CancellationToken cancellationToken)
    {
        // 204 umesto 404: rezervacija bez placanja je normalno stanje, a 404
        // bi browser ispisivao kao gresku u konzoli.
        var result = await paymentService.GetPaymentForBookingAsync(bookingId, cancellationToken);
        if (result is null)
        {
            return NoContent();
        }

        return Ok(result);
    }

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
        var result = await paymentService.CompletePaymentAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:guid}/checkout-session")]
    public async Task<ActionResult<StripeCheckoutResponse>> CreateCheckoutSession(Guid id, CancellationToken cancellationToken)
    {
        var result = await paymentService.CreateCheckoutSessionAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:guid}/confirm-stripe")]
    public async Task<ActionResult<PaymentResponse>> ConfirmStripe(Guid id, CancellationToken cancellationToken)
    {
        var result = await paymentService.ConfirmStripeSessionAsync(id, cancellationToken);
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("webhooks/stripe")]
    public async Task<IActionResult> StripeWebhook(CancellationToken cancellationToken)
    {
        var json = await new StreamReader(Request.Body).ReadToEndAsync(cancellationToken);
        var webhookSecret = configuration["Stripe:WebhookSecret"];

        if (string.IsNullOrEmpty(webhookSecret))
        {
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
            }
        }

        return Ok();
    }
}
