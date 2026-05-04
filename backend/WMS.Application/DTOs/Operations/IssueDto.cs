using WMS.Domain.Enums;
namespace WMS.Application.DTOs.Operations;

public record IssueDto(
    Guid Id,
    Guid WarehouseId,
    string WarehouseName,
    Guid? CustomerId,
    string? CustomerName,
    string CreatedBy,
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
