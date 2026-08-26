using PaymentDomain;

namespace PaymentApplication;

public interface IPaymentRepository
{
    Task<Payment?> FindByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Payment?> FindByBookingIdAsync(Guid bookingId, CancellationToken cancellationToken);
    Task<Payment?> FindByStripeSessionIdAsync(string stripeSessionId, CancellationToken cancellationToken);
    Task<List<Payment>> GetAllAsync(CancellationToken cancellationToken);
    Task AddAsync(Payment payment, CancellationToken cancellationToken);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
