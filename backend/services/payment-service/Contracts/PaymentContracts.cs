namespace PaymentContracts;

public sealed record CreatePaymentRequest(Guid BookingId, decimal Amount, string Currency);
public sealed record PaymentResponse(Guid Id, Guid BookingId, decimal Amount, string Currency, string Status, DateTimeOffset CreatedAtUtc);
public sealed record StripeCheckoutResponse(string SessionId, string CheckoutUrl);
