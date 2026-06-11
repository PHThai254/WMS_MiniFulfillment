namespace WMS.Domain.Entities;

/// <summary>
/// Vai trò người dùng. Hệ thống CHỈ CÓ 3 roles: Admin, QA_QC, Staff.
/// </summary>
public class Role
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;           // Max 50
    public string Description { get; set; } = string.Empty;

    // Navigation
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}