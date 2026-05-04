namespace WMS.Application.DTOs.MasterData;

public record WarehouseDto(
    Guid Id,
    string Name,
    string Location,
    int ZoneCount = 0
);

public record CreateWarehouseRequest(
    string Name,
    string Location
);

public record UpdateWarehouseRequest(
    string Name,
    string Location
);
