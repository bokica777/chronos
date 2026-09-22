using PaymentContracts;

namespace PaymentApplication;

public interface IPaymentService
{
    Task<PaymentResponse> CreatePaymentAsync(CreatePaymentRequest request, CancellationToken cancellationToken);
    Task<PaymentResponse> CompletePaymentAsync(Guid paymentId, CancellationToken cancellationToken);
    Task<PaymentResponse> GetPaymentAsync(Guid paymentId, CancellationToken cancellationToken);
    // Vraca null kad placanje za rezervaciju jos ne postoji (normalno stanje).
    Task<PaymentResponse?> GetPaymentForBookingAsync(Guid bookingId, CancellationToken cancellationToken);
    Task<List<PaymentResponse>> GetAllPaymentsForAdminAsync(CancellationToken cancellationToken);

    Task<StripeCheckoutResponse> CreateCheckoutSessionAsync(Guid paymentId, CancellationToken cancellationToken);
    Task<PaymentResponse> ConfirmStripeSessionAsync(Guid paymentId, CancellationToken cancellationToken);
    Task<PaymentResponse> CompletePaymentByStripeSessionAsync(string stripeSessionId, CancellationToken cancellationToken);
}
