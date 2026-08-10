using Contracts;

namespace PaymentContracts;

public sealed record CreatePaymentRequest(Guid BookingId, decimal Amount, string Currency);
public sealed record PaymentResponse(Guid Id, Guid BookingId, decimal Amount, string Currency, string Status);
public sealed record PaymentCompleted : IntegrationEvent
{
    public required Guid PaymentId { get; init; }
    public required Guid BookingId { get; init; }
}
