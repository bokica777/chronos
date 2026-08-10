using Contracts;

namespace ProviderContracts;

public sealed record CreateProviderRequest(Guid OwnerId, string Name, string? Description);
public sealed record ProviderResponse(Guid Id, Guid OwnerId, string Name, string? Description);
public sealed record ProviderCreated : IntegrationEvent
{
    public required Guid ProviderId { get; init; }
    public required string Name { get; init; }
}
