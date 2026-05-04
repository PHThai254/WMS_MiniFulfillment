namespace WMS.Application.DTOs.MasterData;

public record SupplierDto(
    Guid Id,
    string Name,
    string? ContactPerson,
    string? Phone,
    string? Address
);

public record CreateSupplierRequest(
    string Name,
    string? ContactPerson,
    string? Phone,
    string? Address
);

public record UpdateSupplierRequest(
    string Name,
    string? ContactPerson,
    string? Phone,
    string? Address
);
