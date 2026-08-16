using Contracts;

namespace ProviderContracts;

public sealed record CreateProviderRequest(
    Guid OwnerId,
    string Name,
    string? Description,
    string? ImageUrl,
    string? Address,
    double? Latitude,
    double? Longitude);

public sealed record UpdateProviderRequest(
    string Name,
    string? Description,
    string? AboutUs,
    string? ImageUrl,
    string? Address,
    double? Latitude,
    double? Longitude,
    string? ContactPhone,
    string? ContactEmail,
    string? WorkingHoursStart,
    string? WorkingHoursEnd);

public sealed record SetVisibilityRequest(bool IsVisible);

public sealed record ProviderResponse(
    Guid Id,
    Guid OwnerId,
    string Name,
    string? Description,
    string? AboutUs,
    string? ImageUrl,
    string? Address,
    double? Latitude,
    double? Longitude,
    string? ContactPhone,
    string? ContactEmail,
    string? WorkingHoursStart,
    string? WorkingHoursEnd,
    bool IsActive);
public sealed record ProviderCreated : IntegrationEvent
{
    public required Guid ProviderId { get; init; }
    public required string Name { get; init; }
}
