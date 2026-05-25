namespace WMS.Application.DTOs.Inventory;

public record InventoryDto(
    Guid Id,
    Guid WarehouseId,
    string WarehouseName,
    Guid ZoneId,
    string ZoneName,
    Guid ProductId,
    string ProductName,
    string ProductBarcode,
    string ProductSKU,
    decimal ProductPrice, 
    int Quantity,
    DateTime LastRestockedDate
);

public record StockSummaryDto(
    Guid ProductId,
    string ProductName,
    string ProductBarcode,
    string ProductSKU,
    decimal ProductPrice,
    int TotalQuantity,
    List<StockByZoneDto> StockByZone
);

public record StockByZoneDto(
    Guid ZoneId,
    string ZoneName,
    int Quantity,
    DateTime LastRestockedDate
);

public record InventoryTransactionDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    Guid ZoneId,
    string ZoneName,
    int QuantityChange,
    string TransactionType,
    Guid? ReferenceId,
    DateTime CreatedAt
);

public record AdjustInventoryRequest(
    Guid ProductId,
    Guid ZoneId,
    int NewQuantity,
    string Reason
);