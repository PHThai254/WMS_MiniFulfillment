namespace WMS.Application.DTOs.UserManagement;

/// <summary>
/// DTO trả về thông tin User, bao gồm danh sách Permissions để Frontend phân quyền UI.
/// </summary>
public class UserDto
{
    public Guid Id { get; init; }
    public string Username { get; init; } = string.Empty;
    public string RoleName { get; init; } = string.Empty;
    public Guid RoleId { get; init; }
    public Guid? WarehouseId { get; init; }
    public string? WarehouseName { get; init; }

    /// <summary>
    /// Danh sách tên quyền hạn của User (qua Role -> RolePermissions -> Permission.Name).
    /// Ví dụ: ["run_ocr", "view_dashboard_kpi", "manage_receipts"]
    /// </summary>
    public List<string> Permissions { get; init; } = new();
}

public record CreateUserRequest(
    string Username,
    string Password,
    Guid RoleId,
    Guid? WarehouseId
);

public record UpdateUserRequest(
    string Username,
    Guid RoleId,
    Guid? WarehouseId
);

public record ChangePasswordRequest(
    string NewPassword
);

public record RoleDto(
    Guid Id,
    string Name,
    string Description
);
