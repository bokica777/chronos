namespace Contracts;

public abstract record IntegrationEvent
{
    public Guid EventId { get; init; } = Guid.NewGuid();
    public DateTimeOffset OccurredAtUtc { get; init; } = DateTimeOffset.UtcNow;
    public string CorrelationId { get; init; } = string.Empty;
    public int SchemaVersion { get; init; } = 1;
}
