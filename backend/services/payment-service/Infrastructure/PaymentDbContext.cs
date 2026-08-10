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
            entity.HasIndex(x => x.BookingId);
        });
    }

    public Task<Payment?> FindByIdAsync(Guid id, CancellationToken cancellationToken) =>
        Payments.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task AddAsync(Payment payment, CancellationToken cancellationToken) =>
        await Payments.AddAsync(payment, cancellationToken);

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        base.SaveChangesAsync(cancellationToken);
}
