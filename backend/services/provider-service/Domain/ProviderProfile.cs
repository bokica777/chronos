namespace ProviderDomain;

public sealed class ProviderProfile
{
    private ProviderProfile() { }

    public ProviderProfile(Guid ownerId, string name)
    {
        Id = Guid.NewGuid();
        OwnerId = ownerId;
        Name = string.IsNullOrWhiteSpace(name)
            ? throw new ArgumentException("Provider name is required.", nameof(name))
            : name.Trim();
    }

    public Guid Id { get; private set; }
    public Guid OwnerId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public bool IsActive { get; private set; } = true;
}
