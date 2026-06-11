using WMS.Domain.Enums;
namespace WMS.Application.DTOs.Operations;

public record ReceiptDto(
    Guid Id,
    Guid WarehouseId,
    string WarehouseName,
    Guid? SupplierId,
    string? SupplierName,
    Guid CreatedByUserId,
    string? CreatedByUsername,
    ReceiptStatus Status,
    DateTime CreatedAt,
    List<ReceiptDetailDto> ReceiptDetails
);

public record ReceiptDetailDto(
    Guid Id,
    Guid ReceiptId,
    Guid ProductId,
    string ProductName,
    string ProductBarcode,
    Guid? ZoneId,
    string? ZoneName,
    int ExpectedQuantity,
    int ActualQuantity,
    decimal UnitPrice 
);

public record CreateReceiptRequest(
    Guid WarehouseId,
    Guid? SupplierId,
    List<CreateReceiptDetailRequest> Details
);

public record CreateReceiptDetailRequest(
    Guid ProductId,
    int ExpectedQuantity,
    decimal UnitPrice // 📌 BỔ SUNG: Hứng giá trị nhập từ form của Đức Anh
);

public record UpdateReceiptDetailActualRequest(
    Guid DetailId,
    int ActualQuantity,
    Guid? ZoneId
);

public record ApproveReceiptRequest(
    List<UpdateReceiptDetailActualRequest> Details
);

public record ApproveOcrRequest(
    List<OcrReceiptDetailRequest> Details
);

public record OcrReceiptDetailRequest(
    Guid ProductId,
    int ActualQuantity,
    decimal UnitPrice, // 📌 BỔ SUNG: Phục vụ AI tự điền giá
    Guid? ZoneId
);

public record OcrResultDto(
    string RawJson,
    List<OcrLineItemDto> Items,
    bool HasLowConfidence
);

public record OcrLineItemDto(
    string ProductName,
    int Quantity,
    decimal UnitPrice, 
    bool IsLowConfidence
);