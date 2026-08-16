namespace ProviderContracts;

public sealed record CreateServiceRequest(Guid CategoryId, string Name, string? Description, string? Note, int DurationMinutes, decimal Price);

public sealed record UpdateServiceRequest(Guid CategoryId, string Name, string? Description, string? Note, int DurationMinutes, decimal Price);

public sealed record ServiceResponse(
    Guid Id,
    Guid ProviderId,
    Guid CategoryId,
    string Name,
    string? Description,
    string? Note,
    string? ImageUrl,
    int DurationMinutes,
    decimal Price,
    bool IsActive);
