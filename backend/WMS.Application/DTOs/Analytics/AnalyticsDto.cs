namespace WMS.Application.DTOs.Analytics;

public record DashboardKpiDto(
    int PendingReceipts,
    int ActiveIssues,
    int TotalProducts,
    int TotalWarehouses,
    int LowStockAlerts,
    int CompletedReceiptsToday
);

public record LowStockProductDto(
    Guid ProductId,
    string ProductName,
    string ProductBarcode,
    int TotalQuantity
);

public record StockMovementDto(
    string Date,
    int Inbound,
    int Outbound
);
