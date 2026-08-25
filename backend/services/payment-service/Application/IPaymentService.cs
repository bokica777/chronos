using PaymentContracts;

namespace PaymentApplication;

public interface IPaymentService
{
    Task<PaymentResponse> CreatePaymentAsync(CreatePaymentRequest request, CancellationToken cancellationToken);
    Task<PaymentResponse> CompletePaymentAsync(Guid paymentId, CancellationToken cancellationToken);
    Task<PaymentResponse> GetPaymentAsync(Guid paymentId, CancellationToken cancellationToken);
    Task<PaymentResponse> GetPaymentForBookingAsync(Guid bookingId, CancellationToken cancellationToken);
    Task<List<PaymentResponse>> GetAllPaymentsForAdminAsync(CancellationToken cancellationToken);
}
