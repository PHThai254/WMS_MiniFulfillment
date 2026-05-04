namespace WMS.Application.DTOs.UserManagement;

public record UserDto(
    Guid Id,
    string Username,
    string RoleName,
    Guid RoleId,
    Guid? WarehouseId,
    string? WarehouseName
);

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
