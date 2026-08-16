namespace ProviderContracts;

public sealed record CreateCategoryRequest(string Name, string? IconUrl);

public sealed record UpdateCategoryRequest(string Name, string? IconUrl);

public sealed record CategoryResponse(Guid Id, string Name, string? IconUrl, bool IsActive);
