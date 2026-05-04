namespace WMS.Application.DTOs.MasterData;

public record ZoneDto(
    Guid Id,
    Guid WarehouseId,
    string WarehouseName,
    string Name
);

public record CreateZoneRequest(
    Guid WarehouseId,
    string Name
);

public record UpdateZoneRequest(
    string Name
);
