using Messaging;
using Microsoft.Extensions.Configuration;
using Moq;
using PaymentApplication;
using PaymentContracts;
using PaymentDomain;
using Stripe;
using Xunit;

namespace PaymentService.Tests;

public class PaymentServiceImplTests
{
    private readonly Mock<IPaymentRepository> _paymentRepository = new();
    private readonly Mock<IOutboxRepository> _outboxRepository = new();
    private readonly StripeClient _stripeClient = new("sk_test_fake_key_for_unit_tests");
    private readonly IConfiguration _configuration = new ConfigurationBuilder().Build();
    private readonly PaymentApplication.PaymentServiceImpl _sut;

    public PaymentServiceImplTests()
    {
        _sut = new PaymentApplication.PaymentServiceImpl(
            _paymentRepository.Object,
            _outboxRepository.Object,
            _stripeClient,
            _configuration);
    }

    [Fact]
    public async Task CreatePaymentAsync_ExistingPaymentForBooking_ReturnsExistingWithoutCreatingNew()
    {
        var bookingId = Guid.NewGuid();
        var existing = new Payment(bookingId, 1500m, "RSD");
        _paymentRepository
            .Setup(r => r.FindByBookingIdAsync(bookingId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var result = await _sut.CreatePaymentAsync(new CreatePaymentRequest(bookingId, 1500m, "RSD"), CancellationToken.None);

        Assert.Equal(existing.Id, result.Id);
        _paymentRepository.Verify(r => r.AddAsync(It.IsAny<Payment>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreatePaymentAsync_NoExistingPayment_CreatesNewPendingPayment()
    {
        var bookingId = Guid.NewGuid();
        _paymentRepository
            .Setup(r => r.FindByBookingIdAsync(bookingId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Payment?)null);

        var result = await _sut.CreatePaymentAsync(new CreatePaymentRequest(bookingId, 2000m, "RSD"), CancellationToken.None);

        Assert.Equal("Pending", result.Status);
        Assert.Equal(bookingId, result.BookingId);
        _paymentRepository.Verify(r => r.AddAsync(It.IsAny<Payment>(), It.IsAny<CancellationToken>()), Times.Once);
        _paymentRepository.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CompletePaymentAsync_UnknownPaymentId_ThrowsKeyNotFoundException()
    {
        var paymentId = Guid.NewGuid();
        _paymentRepository
            .Setup(r => r.FindByIdAsync(paymentId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Payment?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => _sut.CompletePaymentAsync(paymentId, CancellationToken.None));
    }

    [Fact]
    public async Task CompletePaymentAsync_PendingPayment_CompletesAndWritesOutboxMessage()
    {
        var payment = new Payment(Guid.NewGuid(), 1000m, "RSD");
        _paymentRepository
            .Setup(r => r.FindByIdAsync(payment.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(payment);

        var result = await _sut.CompletePaymentAsync(payment.Id, CancellationToken.None);

        Assert.Equal("Completed", result.Status);
        _outboxRepository.Verify(
            o => o.AddAsync(It.Is<OutboxMessage>(m => m.Type == "PaymentCompleted"), It.IsAny<CancellationToken>()),
            Times.Once);
        _paymentRepository.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CompletePaymentAsync_AlreadyCompletedPayment_ThrowsInvalidOperationException()
    {
        var payment = new Payment(Guid.NewGuid(), 1000m, "RSD");
        payment.SetStatus(PaymentStatus.Completed);
        _paymentRepository
            .Setup(r => r.FindByIdAsync(payment.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(payment);

        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.CompletePaymentAsync(payment.Id, CancellationToken.None));

        _outboxRepository.Verify(o => o.AddAsync(It.IsAny<OutboxMessage>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetPaymentAsync_UnknownPaymentId_ThrowsKeyNotFoundException()
    {
        var paymentId = Guid.NewGuid();
        _paymentRepository
            .Setup(r => r.FindByIdAsync(paymentId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Payment?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => _sut.GetPaymentAsync(paymentId, CancellationToken.None));
    }

    [Fact]
    public async Task CreateCheckoutSessionAsync_NonPendingPayment_ThrowsInvalidOperationException()
    {
        var payment = new Payment(Guid.NewGuid(), 1000m, "RSD");
        payment.SetStatus(PaymentStatus.Completed);
        _paymentRepository
            .Setup(r => r.FindByIdAsync(payment.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(payment);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.CreateCheckoutSessionAsync(payment.Id, CancellationToken.None));
    }

    [Fact]
    public async Task CompletePaymentByStripeSessionAsync_AlreadyCompleted_IsIdempotentAndSkipsOutbox()
    {
        var payment = new Payment(Guid.NewGuid(), 1000m, "RSD");
        payment.AttachStripeSession("cs_test_123");
        payment.SetStatus(PaymentStatus.Completed);
        _paymentRepository
            .Setup(r => r.FindByStripeSessionIdAsync("cs_test_123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(payment);

        var result = await _sut.CompletePaymentByStripeSessionAsync("cs_test_123", CancellationToken.None);

        Assert.Equal("Completed", result.Status);
        _outboxRepository.Verify(o => o.AddAsync(It.IsAny<OutboxMessage>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
