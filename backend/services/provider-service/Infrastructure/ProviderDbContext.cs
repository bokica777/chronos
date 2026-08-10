using Microsoft.EntityFrameworkCore;
using ProviderApplication;
using ProviderDomain;

namespace ProviderInfrastructure;

public sealed class ProviderDbContext(DbContextOptions<ProviderDbContext> options)
    : DbContext(options), IProviderRepository
{
    public DbSet<ProviderProfile> Providers => Set<ProviderProfile>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProviderProfile>(entity =>
        {
            entity.ToTable("Providers");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(2000);
        });
    }

    public Task<ProviderProfile?> FindByIdAsync(Guid id, CancellationToken cancellationToken) =>
        Providers.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task AddAsync(ProviderProfile provider, CancellationToken cancellationToken) =>
        await Providers.AddAsync(provider, cancellationToken);

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        base.SaveChangesAsync(cancellationToken);
}
