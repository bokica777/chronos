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

// v2 API contract (api/v2/services) - namerno drugaciji oblik od v1 ServiceResponse:
// ugradjuje ProviderName i CategoryName direktno u odgovor, tako da klijent ne mora
// da radi dodatne pozive da bi ih prikazao (npr. na listi usluga). Ovo je stvarna,
// namerna razlika u ugovoru izmedju v1 i v2 API-ja, ne samo drugacija putanja.
public sealed record ServiceResponseV2(
    Guid Id,
    Guid ProviderId,
    string ProviderName,
    Guid CategoryId,
    string CategoryName,
    string Name,
    string? Description,
    string? Note,
    string? ImageUrl,
    int DurationMinutes,
    decimal Price,
    bool IsActive);
