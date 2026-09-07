using Messaging;
using Microsoft.Extensions.Configuration;
using PaymentContracts;
using PaymentDomain;
using Stripe;
using Stripe.Checkout;

namespace PaymentApplication;

public sealed class PaymentServiceImpl(
    IPaymentRepository paymentRepository,
    IEventPublisher eventPublisher,
    StripeClient stripeClient,
    IConfiguration configuration) : IPaymentService
{
    // Stripe test naplata ide u EUR po fiksnom ilustrativnom kursu - RSD nije na
    // Stripe-ovoj zvanicnoj listi "zero-decimal" valuta, ali se u praksi ponekad
    // tako ponasa (poznata nedoslednost), pa bismo rizikovali da naplatimo 100x
    // pogresan iznos na test kartici. Chronos svuda drugde i dalje vodi cenu u
    // RSD - ovo je konverzija samo za prikaz na Stripe-ovoj stranici.
    private const decimal RsdToEurRate = 117m;


    public async Task<PaymentResponse> CreatePaymentAsync(CreatePaymentRequest request, CancellationToken cancellationToken)
    {
        // Idempotentno - ako front pozove kreiranje vise puta za istu rezervaciju
        // (npr. dupli klik na "Simuliraj plaćanje"), vraćamo postojeći zapis
        // umesto da napravimo drugi Payment za istu rezervaciju.
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

    public async Task<PaymentResponse> GetPaymentForBookingAsync(Guid bookingId, CancellationToken cancellationToken)
    {
        var payment = await paymentRepository.FindByBookingIdAsync(bookingId, cancellationToken)
            ?? throw new KeyNotFoundException($"Payment for booking {bookingId} was not found.");

        return ToResponse(payment);
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

    // Poziva front kad se korisnik vrati sa Stripe stranice (success_url). Ne
    // oslanja se samo na ovo - webhook (CompletePaymentByStripeSessionAsync) je
    // pouzdaniji izvor istine ako korisnik zatvori tab pre povratka.
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

    // Poziva webhook kontroler - Stripe salje session id, ne nas Payment.Id.
    public async Task<PaymentResponse> CompletePaymentByStripeSessionAsync(string stripeSessionId, CancellationToken cancellationToken)
    {
        var payment = await paymentRepository.FindByStripeSessionIdAsync(stripeSessionId, cancellationToken)
            ?? throw new KeyNotFoundException($"No payment found for Stripe session {stripeSessionId}.");

        // Stripe moze poslati isti webhook vise puta (at-least-once isporuka) -
        // ako je vec zavrseno (npr. korisnik se prvi vratio na success_url), samo
        // vratimo trenutno stanje umesto da pozovemo Complete() ponovo i dobijemo gresku.
        if (payment.Status == PaymentStatus.Pending)
        {
            await CompleteInternalAsync(payment, cancellationToken);
        }

        return ToResponse(payment);
    }

    private async Task CompleteInternalAsync(Payment payment, CancellationToken cancellationToken)
    {
        payment.Complete();
        await paymentRepository.SaveChangesAsync(cancellationToken);

        await eventPublisher.PublishAsync(new PaymentCompleted
        {
            PaymentId = payment.Id,
            BookingId = payment.BookingId
        }, cancellationToken);
    }

    private static PaymentResponse ToResponse(Payment payment) =>
        new(payment.Id, payment.BookingId, payment.Amount, payment.Currency, payment.Status.ToString(), payment.CreatedAtUtc);
}
