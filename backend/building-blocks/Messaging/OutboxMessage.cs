namespace Messaging;

public sealed class OutboxMessage
{
    private OutboxMessage()
    {
    }

    public OutboxMessage(string type, string payload)
    {
        Id = Guid.NewGuid();
        Type = type;
        Payload = payload;
        OccurredAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid Id { get; init; }
    public string Type { get; init; } = string.Empty;
    public string Payload { get; init; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; init; }
    public DateTimeOffset? ProcessedAtUtc { get; set; }
    public string? Error { get; set; }

    public void MarkProcessed()
    {
        ProcessedAtUtc = DateTimeOffset.UtcNow;
    }
}
