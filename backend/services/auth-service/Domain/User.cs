namespace AuthDomain;

public sealed class User
{
    private User() { }

    public User(string email, string displayName)
    {
        Id = Guid.NewGuid();
        Email = string.IsNullOrWhiteSpace(email)
            ? throw new ArgumentException("Email is required.", nameof(email))
            : email.Trim().ToLowerInvariant();
        DisplayName = displayName.Trim();
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid Id { get; private set; }
    public string Email { get; private set; } = string.Empty;
    public string DisplayName { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public bool IsActive { get; private set; } = true;
}
