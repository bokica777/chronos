using Contracts;

namespace PaymentContracts;

public sealed record CreatePaymentRequest(Guid BookingId, decimal Amount, string Currency);
// CreatedAtUtc dodat radi admin panela (kartica placanja) - ranije se nije
// slao iako domenski entitet (Payment.cs) odavno ima taj podatak.
public sealed record PaymentResponse(Guid Id, Guid BookingId, decimal Amount, string Currency, string Status, DateTimeOffset CreatedAtUtc);
public sealed record StripeCheckoutResponse(string SessionId, string CheckoutUrl);
public sealed record PaymentCompleted : IntegrationEvent
{
    public required Guid PaymentId { get; init; }
    public required Guid BookingId { get; init; }
}
