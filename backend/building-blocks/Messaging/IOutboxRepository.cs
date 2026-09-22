namespace Messaging;

public interface IOutboxRepository
{
    Task AddAsync(OutboxMessage message, CancellationToken cancellationToken);
    Task<List<OutboxMessage>> GetPendingAsync(CancellationToken cancellationToken);
}
