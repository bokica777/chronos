using PaymentDomain;

namespace PaymentApplication;

public interface IPaymentRepository
{
    Task<Payment?> FindByIdAsync(Guid id, CancellationToken cancellationToken);
    Task AddAsync(Payment payment, CancellationToken cancellationToken);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
