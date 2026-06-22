using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WMS.Infrastructure.Data;

namespace WMS.API.Authorization;

// ══════════════════════════════════════════════════════════════════════════════
// 1. Requirement – "Tôi cần permission tên X để thực hiện action này"
// ══════════════════════════════════════════════════════════════════════════════
public class PermissionRequirement : IAuthorizationRequirement
{
    public string PermissionName { get; }

    public PermissionRequirement(string permissionName)
    {
        PermissionName = permissionName;
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. Handler – Kiểm tra DB xem Role của User hiện tại có Permission đó không
// ══════════════════════════════════════════════════════════════════════════════
public class PermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IServiceScopeFactory _scopeFactory;

    public PermissionHandler(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        // Lấy RoleId từ JWT claim
        var roleIdClaim = context.User.FindFirst("RoleId")?.Value
                       ?? context.User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(roleIdClaim))
        {
            context.Fail();
            return;
        }

        // Dùng scope mới để tránh vấn đề DbContext lifetime trong singleton handler
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        // Kiểm tra bằng RoleId (Guid) hoặc tên Role
        bool hasPermission;

        if (Guid.TryParse(roleIdClaim, out var roleId))
        {
            hasPermission = await db.RolePermissions
                .AsNoTracking()
                .AnyAsync(rp =>
                    rp.RoleId == roleId &&
                    rp.Permission!.Name == requirement.PermissionName);
        }
        else
        {
            // Fallback: tìm theo tên Role
            hasPermission = await db.RolePermissions
                .AsNoTracking()
                .AnyAsync(rp =>
                    rp.Role!.Name == roleIdClaim &&
                    rp.Permission!.Name == requirement.PermissionName);
        }

        if (hasPermission)
            context.Succeed(requirement);
        else
            context.Fail();
    }
}
