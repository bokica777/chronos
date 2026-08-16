using Microsoft.EntityFrameworkCore;
using ProviderApplication;
using ProviderDomain;

namespace ProviderInfrastructure;

public sealed class ProviderDbContext(DbContextOptions<ProviderDbContext> options)
    : DbContext(options), IProviderRepository, IServiceRepository, ICategoryRepository
{
    public DbSet<ProviderProfile> Providers => Set<ProviderProfile>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Category> Categories => Set<Category>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProviderProfile>(entity =>
        {
            entity.ToTable("Providers");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(2000);
            entity.Property(x => x.AboutUs).HasMaxLength(4000);
            entity.Property(x => x.ImageUrl).HasMaxLength(500);
            entity.Property(x => x.Address).HasMaxLength(300);
            entity.Property(x => x.ContactPhone).HasMaxLength(50);
            entity.Property(x => x.ContactEmail).HasMaxLength(320);
            entity.Property(x => x.WorkingHoursStart).HasMaxLength(5);
            entity.Property(x => x.WorkingHoursEnd).HasMaxLength(5);
        });

        modelBuilder.Entity<Service>(entity =>
        {
            entity.ToTable("Services");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(2000);
            entity.Property(x => x.Note).HasMaxLength(2000);
            entity.Property(x => x.ImageUrl).HasMaxLength(500);
            entity.Property(x => x.Price).HasPrecision(18, 2);
            entity.HasIndex(x => x.ProviderId);
            entity.HasIndex(x => x.CategoryId);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("Categories");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(100).IsRequired();
            entity.Property(x => x.IconUrl).HasMaxLength(500);
        });
    }

    public Task<ProviderProfile?> FindByIdAsync(Guid id, CancellationToken cancellationToken) =>
        Providers.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<ProviderProfile?> FindByOwnerIdAsync(Guid ownerId, CancellationToken cancellationToken) =>
        Providers.SingleOrDefaultAsync(x => x.OwnerId == ownerId, cancellationToken);

    public Task<List<ProviderProfile>> GetAllAsync(CancellationToken cancellationToken) =>
        Providers.Where(x => x.IsActive).ToListAsync(cancellationToken);

    public async Task AddAsync(ProviderProfile provider, CancellationToken cancellationToken) =>
        await Providers.AddAsync(provider, cancellationToken);

    public void Remove(ProviderProfile provider) => Providers.Remove(provider);

    public Task<Service?> FindServiceByIdAsync(Guid id, CancellationToken cancellationToken) =>
        Services.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<List<Service>> GetServicesByProviderIdAsync(Guid providerId, CancellationToken cancellationToken) =>
        Services.Where(x => x.ProviderId == providerId).ToListAsync(cancellationToken);

    // Javna "sve usluge" lista - usluga mora biti aktivna I njen provajder mora
    // biti vidljiv (IsActive), inace bi se ugasen profil i dalje pojavljivao
    // na javnoj pretrazi usluga.
    public Task<List<Service>> GetAllActivePublicServicesAsync(CancellationToken cancellationToken) =>
        (from service in Services
         join provider in Providers on service.ProviderId equals provider.Id
         where service.IsActive && provider.IsActive
         select service).ToListAsync(cancellationToken);

    public async Task AddServiceAsync(Service service, CancellationToken cancellationToken) =>
        await Services.AddAsync(service, cancellationToken);

    public void RemoveService(Service service) => Services.Remove(service);

    public Task<Category?> FindCategoryByIdAsync(Guid id, CancellationToken cancellationToken) =>
        Categories.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<List<Category>> GetAllCategoriesAsync(CancellationToken cancellationToken) =>
        Categories.Where(x => x.IsActive).ToListAsync(cancellationToken);

    public async Task AddCategoryAsync(Category category, CancellationToken cancellationToken) =>
        await Categories.AddAsync(category, cancellationToken);

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        base.SaveChangesAsync(cancellationToken);
}
