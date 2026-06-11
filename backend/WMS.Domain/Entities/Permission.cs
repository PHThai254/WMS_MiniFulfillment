namespace WMS.Domain.Entities;

/// <summary>
/// Quyền hạn trong hệ thống (Permission).
/// Group: nhóm quyền logic, VD: "Receipt", "Inventory", "Issue"
/// </summary>
public class Permission
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;   // Max 100, Unique Key
    public string Group { get; set; } = string.Empty;  // Max 50

    // Navigation
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
