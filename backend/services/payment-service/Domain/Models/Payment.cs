namespace PaymentDomain;

public sealed class Payment
{
    private Payment() { }

    public Payment(Guid bookingId, decimal amount, string currency)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        Id = Guid.NewGuid();
        BookingId = bookingId;
        Amount = amount;
        Currency = currency.ToUpperInvariant();
        Status = PaymentStatus.Pending;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid BookingId { get; private set; }
    public decimal Amount { get; private set; }
    public string Currency { get; private set; } = string.Empty;
    public PaymentStatus Status { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }

    public string? StripeSessionId { get; private set; }

    public void AttachStripeSession(string sessionId)
    {
        StripeSessionId = sessionId;
    }

    public void SetStatus(PaymentStatus status)
    {
        Status = status;
    }
}
