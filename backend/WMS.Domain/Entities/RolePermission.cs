namespace WMS.Domain.Entities;

/// <summary>
/// Bảng liên kết Many-to-Many giữa Role và Permission.
/// Composite PK: (RoleId, PermissionId).
/// </summary>
public class RolePermission
{
    public Guid RoleId { get; set; }
    public Role? Role { get; set; }

    public Guid PermissionId { get; set; }
    public Permission? Permission { get; set; }
}
