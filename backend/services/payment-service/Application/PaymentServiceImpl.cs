using Messaging;
using PaymentContracts;
using PaymentDomain;

namespace PaymentApplication;

public sealed class PaymentServiceImpl(
    IPaymentRepository paymentRepository,
    IEventPublisher eventPublisher) : IPaymentService
{
    public async Task<PaymentResponse> CreatePaymentAsync(CreatePaymentRequest request, CancellationToken cancellationToken)
    {
        var payment = new Payment(request.BookingId, request.Amount, request.Currency);
        await paymentRepository.AddAsync(payment, cancellationToken);
        await paymentRepository.SaveChangesAsync(cancellationToken);

        return ToResponse(payment);
    }

    public async Task<PaymentResponse> CompletePaymentAsync(Guid paymentId, CancellationToken cancellationToken)
    {
        var payment = await paymentRepository.FindByIdAsync(paymentId, cancellationToken)
            ?? throw new KeyNotFoundException($"Payment {paymentId} was not found.");

        payment.Complete();
        await paymentRepository.SaveChangesAsync(cancellationToken);

        await eventPublisher.PublishAsync(new PaymentCompleted
        {
            PaymentId = payment.Id,
            BookingId = payment.BookingId
        }, cancellationToken);

        return ToResponse(payment);
    }

    public async Task<PaymentResponse> GetPaymentAsync(Guid paymentId, CancellationToken cancellationToken)
    {
        var payment = await paymentRepository.FindByIdAsync(paymentId, cancellationToken)
            ?? throw new KeyNotFoundException($"Payment {paymentId} was not found.");

        return ToResponse(payment);
    }

    private static PaymentResponse ToResponse(Payment payment) =>
        new(payment.Id, payment.BookingId, payment.Amount, payment.Currency, payment.Status.ToString());
}
