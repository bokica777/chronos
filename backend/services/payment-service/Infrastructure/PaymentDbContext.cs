using Microsoft.EntityFrameworkCore;
using PaymentApplication;
using PaymentDomain;

namespace PaymentInfrastructure;

public sealed class PaymentDbContext(DbContextOptions<PaymentDbContext> options)
    : DbContext(options), IPaymentRepository
{
    public DbSet<Payment> Payments => Set<Payment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("Payments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Amount).HasPrecision(18, 2);
            entity.Property(x => x.Currency).HasMaxLength(3).IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
            entity.Property(x => x.StripeSessionId).HasMaxLength(200);
            entity.HasIndex(x => x.BookingId);
        });
    }

    public Task<Payment?> FindByIdAsync(Guid id, CancellationToken cancellationToken) =>
        Payments.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    // Ne oslanjamo se na jedinstvenost u bazi (nema unique indeksa na BookingId) -
    // uzimamo najnoviji ako bi ih ikad slucajno bilo vise za istu rezervaciju.
    public Task<Payment?> FindByBookingIdAsync(Guid bookingId, CancellationToken cancellationToken) =>
        Payments.Where(x => x.BookingId == bookingId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<Payment?> FindByStripeSessionIdAsync(string stripeSessionId, CancellationToken cancellationToken) =>
        Payments.SingleOrDefaultAsync(x => x.StripeSessionId == stripeSessionId, cancellationToken);

    public Task<List<Payment>> GetAllAsync(CancellationToken cancellationToken) =>
        Payments.OrderByDescending(x => x.CreatedAtUtc).ToListAsync(cancellationToken);

    public async Task AddAsync(Payment payment, CancellationToken cancellationToken) =>
        await Payments.AddAsync(payment, cancellationToken);

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        base.SaveChangesAsync(cancellationToken);
}
