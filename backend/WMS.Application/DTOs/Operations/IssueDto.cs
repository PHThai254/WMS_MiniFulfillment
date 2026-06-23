using WMS.Domain.Enums;
namespace WMS.Application.DTOs.Operations;

public record IssueDto(
    Guid Id,
    Guid WarehouseId,
    string WarehouseName,
    Guid? CustomerId,
    string? CustomerName,
    Guid CreatedByUserId,
    string? CreatedByUsername,
    IssueStatus Status,
    DateTime CreatedAt,
    List<IssueDetailDto> IssueDetails
);

public record IssueDetailDto(
    Guid Id,
    Guid IssueId,
    Guid ProductId,
    string ProductName,
    string ProductBarcode,
    Guid? ZoneId,
    string? ZoneName,
    int QuantityToPick,
    int PickedQuantity
);

public record CreateIssueRequest(
    Guid WarehouseId,
    Guid? CustomerId,
    List<CreateIssueDetailRequest> Details
);

public record CreateIssueDetailRequest(
    Guid ProductId,
    int QuantityToPick
);

public record PickingPlanDto(
    Guid IssueId,
    List<PickingPlanItemDto> Items
);

public record PickingPlanItemDto(
    Guid IssueDetailId,
    Guid ProductId,
    string ProductName,
    string ProductBarcode,
    Guid ZoneId,
    string ZoneName,
    int QuantityToPick,
    DateTime RestockedDate
);

public record ConfirmPickRequest(
    Guid IssueDetailId,
    int PickedQuantity
);

/// <summary>
/// DTO xác nhận số lượng thực lấy cho toàn bộ phiếu xuất (batch confirm).
/// Nhận IssueId và danh sách tất cả dòng hàng đã nhặt trong 1 lần gọi duy nhất.
/// </summary>
public record ConfirmPickingRequestDto(
    Guid IssueId,
    List<PickedItemDto> PickedItems
);

/// <summary>
/// Chi tiết 1 dòng hàng được xác nhận: ProductId + số lượng thực lấy.
/// </summary>
public record PickedItemDto(
    Guid ProductId,
    int ActualQuantity
);
