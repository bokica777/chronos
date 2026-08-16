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
    public string? AboutUs { get; private set; }
    public string? ImageUrl { get; private set; }
    public string? Address { get; private set; }
    public double? Latitude { get; private set; }
    public double? Longitude { get; private set; }
    public string? ContactPhone { get; private set; }
    public string? ContactEmail { get; private set; }
    public string? WorkingHoursStart { get; private set; }
    public string? WorkingHoursEnd { get; private set; }
    public bool IsActive { get; private set; } = true;

    public void Rename(string name)
    {
        Name = string.IsNullOrWhiteSpace(name)
            ? throw new ArgumentException("Provider name is required.", nameof(name))
            : name.Trim();
    }

    public void UpdateDescription(string? description)
    {
        Description = description?.Trim();
    }

    public void UpdateAboutUs(string? aboutUs)
    {
        AboutUs = aboutUs?.Trim();
    }

    public void UpdateContact(string? contactPhone, string? contactEmail)
    {
        ContactPhone = contactPhone?.Trim();
        ContactEmail = contactEmail?.Trim();
    }

    public void UpdateWorkingHours(string? workingHoursStart, string? workingHoursEnd)
    {
        WorkingHoursStart = workingHoursStart?.Trim();
        WorkingHoursEnd = workingHoursEnd?.Trim();
    }

    public void UpdateImage(string? imageUrl)
    {
        ImageUrl = imageUrl?.Trim();
    }

    public void UpdateLocation(string? address, double? latitude, double? longitude)
    {
        Address = address?.Trim();
        Latitude = latitude;
        Longitude = longitude;
    }

    public void Deactivate()
    {
        IsActive = false;
    }

    public void Activate()
    {
        IsActive = true;
    }
}
