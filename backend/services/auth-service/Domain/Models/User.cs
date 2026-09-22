namespace AuthDomain;

public sealed class User
{
    private User() { }

    public User(string email, string displayName, UserRole role)
    {
        Id = Guid.NewGuid();
        Email = string.IsNullOrWhiteSpace(email)
            ? throw new ArgumentException("Email is required.", nameof(email))
            : email.Trim().ToLowerInvariant();
        DisplayName = string.IsNullOrWhiteSpace(displayName)
            ? throw new ArgumentException("Display name is required.", nameof(displayName))
            : displayName.Trim();
        Role = role;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public void SetPassword(string passwordHash)
    {
        PasswordHash = string.IsNullOrWhiteSpace(passwordHash)
            ? throw new ArgumentException("Password hash is required.", nameof(passwordHash))
            : passwordHash;
    }

    public void SetRole(UserRole role) => Role = role;

    public void SetActive(bool isActive) => IsActive = isActive;

    public void UpdatePhoneNumber(string? phoneNumber) => PhoneNumber = phoneNumber?.Trim();

    public void UpdateImage(string? imageUrl) => ImageUrl = imageUrl?.Trim();

    public Guid Id { get; private set; }
    public string Email { get; private set; } = string.Empty;
    public string DisplayName { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public UserRole Role { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public bool IsActive { get; private set; } = true;
    public string? PhoneNumber { get; private set; }
    public string? ImageUrl { get; private set; }
}
