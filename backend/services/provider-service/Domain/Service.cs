namespace ProviderDomain;

public sealed class Service
{
    private Service() { }

    public Service(Guid providerId, Guid categoryId, string name, string? description, string? note, int durationMinutes, decimal price)
    {
        Id = Guid.NewGuid();
        ProviderId = providerId;
        CategoryId = categoryId;
        Name = string.IsNullOrWhiteSpace(name)
            ? throw new ArgumentException("Service name is required.", nameof(name))
            : name.Trim();
        Description = description?.Trim();
        Note = note?.Trim();
        DurationMinutes = durationMinutes > 0
            ? durationMinutes
            : throw new ArgumentOutOfRangeException(nameof(durationMinutes), "Duration must be greater than zero.");
        Price = price >= 0
            ? price
            : throw new ArgumentOutOfRangeException(nameof(price), "Price cannot be negative.");
        IsActive = true;
    }

    public Guid Id { get; private set; }
    public Guid ProviderId { get; private set; }
    public Guid CategoryId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string? Note { get; private set; }
    public string? ImageUrl { get; private set; }
    public int DurationMinutes { get; private set; }
    public decimal Price { get; private set; }
    public bool IsActive { get; private set; } = true;

    public void Update(Guid categoryId, string name, string? description, string? note, int durationMinutes, decimal price)
    {
        CategoryId = categoryId;
        Name = string.IsNullOrWhiteSpace(name)
            ? throw new ArgumentException("Service name is required.", nameof(name))
            : name.Trim();
        Description = description?.Trim();
        Note = note?.Trim();
        DurationMinutes = durationMinutes > 0
            ? durationMinutes
            : throw new ArgumentOutOfRangeException(nameof(durationMinutes), "Duration must be greater than zero.");
        Price = price >= 0
            ? price
            : throw new ArgumentOutOfRangeException(nameof(price), "Price cannot be negative.");
    }

    public void UpdateImage(string? imageUrl) => ImageUrl = imageUrl?.Trim();

    public void Deactivate() => IsActive = false;

    public void Activate() => IsActive = true;
}
