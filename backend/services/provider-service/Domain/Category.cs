namespace ProviderDomain;

public sealed class Category
{
    private Category() { }

    public Category(string name, string? iconUrl)
    {
        Id = Guid.NewGuid();
        Name = string.IsNullOrWhiteSpace(name)
            ? throw new ArgumentException("Category name is required.", nameof(name))
            : name.Trim();
        IconUrl = iconUrl?.Trim();
        IsActive = true;
    }

    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? IconUrl { get; private set; }
    public bool IsActive { get; private set; } = true;

    public void Update(string name, string? iconUrl)
    {
        Name = string.IsNullOrWhiteSpace(name)
            ? throw new ArgumentException("Category name is required.", nameof(name))
            : name.Trim();
        IconUrl = iconUrl?.Trim();
    }

    public void Deactivate() => IsActive = false;

    public void Activate() => IsActive = true;
}
