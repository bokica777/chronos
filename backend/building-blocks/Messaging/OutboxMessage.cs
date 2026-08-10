namespace Messaging;

public sealed class OutboxMessage
{
    public Guid Id { get; init; }
    public string Type { get; init; } = string.Empty;
    public string Payload { get; init; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; init; }
    public DateTimeOffset? ProcessedAtUtc { get; set; }
    public string? Error { get; set; }
}
