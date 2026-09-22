using System.Text.Json;
using Messaging;
using Microsoft.Extensions.Configuration;
using PaymentContracts;
using PaymentDomain;
using Stripe;
using Stripe.Checkout;

namespace PaymentApplication;

public sealed class PaymentServiceImpl(
    IPaymentRepository paymentRepository,
    IOutboxRepository outboxRepository,
    StripeClient stripeClient,
    IConfiguration configuration) : IPaymentService
{
    private const decimal RsdToEurRate = 117m;

    public async Task<PaymentResponse> CreatePaymentAsync(CreatePaymentRequest request, CancellationToken cancellationToken)
    {
        var existing = await paymentRepository.FindByBookingIdAsync(request.BookingId, cancellationToken);
        if (existing is not null)
        {
            return ToResponse(existing);
        }

        var payment = new Payment(request.BookingId, request.Amount, request.Currency);
        await paymentRepository.AddAsync(payment, cancellationToken);
        await paymentRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(payment);
    }

    public async Task<PaymentResponse> CompletePaymentAsync(Guid paymentId, CancellationToken cancellationToken)
    {
        var payment = await paymentRepository.FindByIdAsync(paymentId, cancellationToken)
            ?? throw new KeyNotFoundException($"Payment {paymentId} was not found.");

        await CompleteInternalAsync(payment, cancellationToken);
        return ToResponse(payment);
    }

    public async Task<PaymentResponse> GetPaymentAsync(Guid paymentId, CancellationToken cancellationToken)
    {
        var payment = await paymentRepository.FindByIdAsync(paymentId, cancellationToken)
            ?? throw new KeyNotFoundException($"Payment {paymentId} was not found.");

        return ToResponse(payment);
    }

    public async Task<PaymentResponse?> GetPaymentForBookingAsync(Guid bookingId, CancellationToken cancellationToken)
    {
        var payment = await paymentRepository.FindByBookingIdAsync(bookingId, cancellationToken);
        return payment is null ? null : ToResponse(payment);
    }

    public async Task<List<PaymentResponse>> GetAllPaymentsForAdminAsync(CancellationToken cancellationToken)
    {
        var payments = await paymentRepository.GetAllAsync(cancellationToken);
        return payments.Select(ToResponse).ToList();
    }

    public async Task<StripeCheckoutResponse> CreateCheckoutSessionAsync(Guid paymentId, CancellationToken cancellationToken)
    {
        var payment = await paymentRepository.FindByIdAsync(paymentId, cancellationToken)
            ?? throw new KeyNotFoundException($"Payment {paymentId} was not found.");

        if (payment.Status != PaymentStatus.Pending)
            throw new InvalidOperationException("Only a pending payment can start a Stripe checkout.");

        var frontendBaseUrl = configuration["Frontend:BaseUrl"]
            ?? throw new InvalidOperationException("Frontend:BaseUrl is missing.");
        var amountInEurCents = (long)Math.Round(payment.Amount / RsdToEurRate * 100, MidpointRounding.AwayFromZero);

        var sessionOptions = new SessionCreateOptions
        {
            Mode = "payment",
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<SessionLineItemOptions>
            {
                new SessionLineItemOptions
                {
                    Quantity = 1,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "eur",
                        UnitAmount = amountInEurCents,
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = $"Chronos rezervacija {payment.BookingId}",
                        },
                    },
                },
            },
            SuccessUrl = $"{frontendBaseUrl}/bookings?payment=success&paymentId={payment.Id}",
            CancelUrl = $"{frontendBaseUrl}/bookings?payment=cancelled&paymentId={payment.Id}",
            Metadata = new Dictionary<string, string>
            {
                { "paymentId", payment.Id.ToString() },
                { "bookingId", payment.BookingId.ToString() },
            },
        };

        var session = await stripeClient.V1.Checkout.Sessions.CreateAsync(sessionOptions, cancellationToken: cancellationToken);

        payment.AttachStripeSession(session.Id);
        await paymentRepository.SaveChangesAsync(cancellationToken);

        return new StripeCheckoutResponse(session.Id, session.Url);
    }

    public async Task<PaymentResponse> ConfirmStripeSessionAsync(Guid paymentId, CancellationToken cancellationToken)
    {
        var payment = await paymentRepository.FindByIdAsync(paymentId, cancellationToken)
            ?? throw new KeyNotFoundException($"Payment {paymentId} was not found.");

        if (payment.Status == PaymentStatus.Completed)
            return ToResponse(payment);

        if (payment.StripeSessionId is null)
            throw new InvalidOperationException("Payment has no associated Stripe checkout session.");

        var session = await stripeClient.V1.Checkout.Sessions.GetAsync(payment.StripeSessionId, cancellationToken: cancellationToken);

        if (session.PaymentStatus == "paid")
        {
            await CompleteInternalAsync(payment, cancellationToken);
        }

        return ToResponse(payment);
    }

    public async Task<PaymentResponse> CompletePaymentByStripeSessionAsync(string stripeSessionId, CancellationToken cancellationToken)
    {
        var payment = await paymentRepository.FindByStripeSessionIdAsync(stripeSessionId, cancellationToken)
            ?? throw new KeyNotFoundException($"No payment found for Stripe session {stripeSessionId}.");

        if (payment.Status == PaymentStatus.Pending)
        {
            await CompleteInternalAsync(payment, cancellationToken);
        }

        return ToResponse(payment);
    }

    private async Task CompleteInternalAsync(Payment payment, CancellationToken cancellationToken)
    {
        Complete(payment);

        var payload = JsonSerializer.Serialize(new
        {
            paymentId = payment.Id,
            bookingId = payment.BookingId,
            eventId = Guid.NewGuid()
        });
        await outboxRepository.AddAsync(new OutboxMessage("PaymentCompleted", payload), cancellationToken);

        await paymentRepository.SaveChangesAsync(cancellationToken);
    }

    private static void Complete(Payment payment)
    {
        if (payment.Status != PaymentStatus.Pending)
            throw new InvalidOperationException("Only a pending payment can be completed.");

        payment.SetStatus(PaymentStatus.Completed);
    }

    private static PaymentResponse ToResponse(Payment payment) =>
        new(payment.Id, payment.BookingId, payment.Amount, payment.Currency, payment.Status.ToString(), payment.CreatedAtUtc);
}
