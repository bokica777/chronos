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

    // ID Stripe Checkout Session-a povezane sa ovim placanjem - null dok se ne
    // pokrene Stripe checkout tok. Cuva se da bismo, kad se korisnik vrati sa
    // Stripe stranice (ili kad stigne webhook), znali koju sesiju da proverimo.
    public string? StripeSessionId { get; private set; }

    public void AttachStripeSession(string sessionId)
    {
        StripeSessionId = sessionId;
    }

    public void Complete()
    {
        if (Status != PaymentStatus.Pending)
            throw new InvalidOperationException("Only a pending payment can be completed.");
        Status = PaymentStatus.Completed;
    }

    public void Fail()
    {
        if (Status != PaymentStatus.Pending)
            throw new InvalidOperationException("Only a pending payment can be failed.");
        Status = PaymentStatus.Failed;
    }

    public void Refund()
    {
        if (Status != PaymentStatus.Completed)
            throw new InvalidOperationException("Only a completed payment can be refunded.");
        Status = PaymentStatus.Refunded;
    }
}
