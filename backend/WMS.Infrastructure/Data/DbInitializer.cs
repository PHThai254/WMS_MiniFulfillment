using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using WMS.Domain.Entities;
using Bogus;

namespace WMS.Infrastructure.Data;

/// <summary>
/// DbInitializer: Seed dữ liệu khởi tạo hệ thống.
/// Chỉ sử dụng 3 Roles: Admin, QA_QC, Staff.  (Manager đã bị loại bỏ hoàn toàn)
/// </summary>
public static class DbInitializer
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        await context.Database.MigrateAsync();

        var (adminRole, qaRole, staffRole) = await EnsureRolesAsync(context);
        var permissions = await EnsurePermissionsAsync(context);
        await EnsureRolePermissionsAsync(context, adminRole, qaRole, staffRole, permissions);
        await EnsureAdminUserAsync(context, adminRole);
        await EnsureMasterDataAsync(context);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 1: Roles – CHỈ 3 ROLES, loại bỏ Manager hoàn toàn
    // ══════════════════════════════════════════════════════════════════════════
    private static async Task<(Role admin, Role qaQc, Role staff)> EnsureRolesAsync(ApplicationDbContext context)
    {
        var existingRoles = await context.Roles.ToListAsync();

        Role EnsureRole(string name, string description)
        {
            var role = existingRoles.FirstOrDefault(r => r.Name == name);
            if (role != null) return role;

            role = new Role { Id = Guid.NewGuid(), Name = name, Description = description };
            context.Roles.Add(role);
            return role;
        }

        var admin  = EnsureRole("Admin",  "Quản trị hệ thống toàn quyền");
        var qaQc   = EnsureRole("QA_QC",  "Kiểm tra chất lượng & duyệt phiếu OCR");
        var staff  = EnsureRole("Staff",  "Nhân viên kho: quét, cất, nhặt hàng");

        // Xóa role Manager nếu vẫn còn tồn tại trong DB (cleanup dữ liệu cũ)
        var managerRole = existingRoles.FirstOrDefault(r => r.Name == "Manager");
        if (managerRole != null)
        {
            context.Roles.Remove(managerRole);
        }

        await context.SaveChangesAsync();
        return (admin, qaQc, staff);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 2: Permissions – Danh sách quyền hạn chi tiết
    // ══════════════════════════════════════════════════════════════════════════
    private static async Task<Dictionary<string, Permission>> EnsurePermissionsAsync(ApplicationDbContext context)
    {
        // Danh sách tất cả permissions trong hệ thống
        var permissionDefinitions = new[]
        {
            // ── Receipt ─────────────────────────────────────────────────────
            ("create_receipt",          "Receipt"),
            ("view_receipt",            "Receipt"),
            ("approve_qc_receipt",      "Receipt"),
            ("approve_ocr_receipt",     "Receipt"),
            ("complete_putaway",        "Receipt"),
            ("save_from_ocr",           "Receipt"),
            ("run_ocr",                 "Receipt"),

            // ── Issue ────────────────────────────────────────────────────────
            ("create_issue",            "Issue"),
            ("view_issue",              "Issue"),
            ("get_picking_plan",        "Issue"),
            ("confirm_pick",            "Issue"),
            ("handover_issue",          "Issue"),

            // ── Inventory ────────────────────────────────────────────────────
            ("view_inventory",          "Inventory"),
            ("adjust_inventory",        "Inventory"),
            ("view_transactions",       "Inventory"),
            ("view_stock_summary",      "Inventory"),

            // ── Master Data ──────────────────────────────────────────────────
            ("manage_warehouses",       "MasterData"),
            ("manage_zones",            "MasterData"),
            ("manage_products",         "MasterData"),
            ("manage_categories",       "MasterData"),
            ("manage_suppliers",        "MasterData"),
            ("manage_customers",        "MasterData"),

            // ── User Management ──────────────────────────────────────────────
            ("manage_users",            "UserManagement"),

            // ── Analytics ────────────────────────────────────────────────────
            ("view_analytics",          "Analytics"),
        };

        var existingPerms = await context.Permissions.ToListAsync();
        var result = new Dictionary<string, Permission>();

        foreach (var (name, group) in permissionDefinitions)
        {
            var perm = existingPerms.FirstOrDefault(p => p.Name == name);
            if (perm == null)
            {
                perm = new Permission { Id = Guid.NewGuid(), Name = name, Group = group };
                context.Permissions.Add(perm);
            }
            result[name] = perm;
        }

        await context.SaveChangesAsync();
        return result;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 3: RolePermissions – Map quyền cho từng Role
    // ══════════════════════════════════════════════════════════════════════════
    private static async Task EnsureRolePermissionsAsync(
        ApplicationDbContext context,
        Role admin, Role qaQc, Role staff,
        Dictionary<string, Permission> perms)
    {
        var existing = await context.RolePermissions.ToListAsync();

        void Grant(Role role, params string[] permissionNames)
        {
            foreach (var name in permissionNames)
            {
                if (!perms.TryGetValue(name, out var perm)) continue;
                var alreadyGranted = existing.Any(rp =>
                    rp.RoleId == role.Id && rp.PermissionId == perm.Id);
                if (!alreadyGranted)
                {
                    context.RolePermissions.Add(new RolePermission
                    {
                        RoleId       = role.Id,
                        PermissionId = perm.Id
                    });
                }
            }
        }

        // Admin: TẤT CẢ quyền
        Grant(admin, perms.Keys.ToArray());

        // QA_QC: Chỉ quyền OCR, duyệt phiếu, xem tồn kho
        Grant(qaQc,
            "view_receipt",
            "approve_qc_receipt",
            "approve_ocr_receipt",
            "save_from_ocr",
            "run_ocr",
            "view_inventory",
            "view_stock_summary",
            "view_transactions",
            "view_issue"
        );

        // Staff: Chỉ quyền quét cất hàng và nhặt hàng
        Grant(staff,
            "view_receipt",
            "complete_putaway",
            "view_issue",
            "get_picking_plan",
            "confirm_pick",
            "handover_issue",
            "view_inventory",
            "view_stock_summary"
        );

        await context.SaveChangesAsync();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 4: Admin User mặc định
    // ══════════════════════════════════════════════════════════════════════════
    private static async Task EnsureAdminUserAsync(ApplicationDbContext context, Role adminRole)
    {
        var hasAdmin = await context.Users.AnyAsync(u => u.Username == "admin");
        if (hasAdmin) return;

        // Lấy hoặc dùng ID của admin user mẫu (seed)
        // CreatedByUserId cho Receipt/Issue sẽ dùng ID này
        var adminUserId = Guid.NewGuid();

        context.Users.Add(new User
        {
            Id           = adminUserId,
            Username     = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            RoleId       = adminRole.Id,
            WarehouseId  = null  // Admin không gắn kho cụ thể
        });

        await context.SaveChangesAsync();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 5: Master Data (Products, Categories, v.v.)
    // ══════════════════════════════════════════════════════════════════════════
    private static async Task EnsureMasterDataAsync(ApplicationDbContext context)
    {
        if (await context.Products.AnyAsync()) return;

        var categoryNames = new[]
        {
            "Đồ điện gia dụng", "Thiết bị nhà bếp", "Dụng cụ vệ sinh",
            "Thực phẩm đóng gói", "Đồ uống", "Gia vị", "Hóa mỹ phẩm"
        };

        var productNames = new[]
        {
            // Đồ gia dụng
            "Nồi cơm điện Sunhouse 1.8L", "Lò vi sóng Sharp 20L", "Bếp từ đôi Kangaroo",
            "Quạt đứng Senko", "Ấm siêu tốc Philips 1.5L", "Máy xay sinh tố Panasonic",
            "Chảo chống dính Elmich", "Cây lau nhà 360 độ",
            // FMCG
            "Thùng 30 gói mì Hảo Hảo", "Nước mắm Nam Ngư 750ml", "Dầu ăn Tường An 1L",
            "Lốc 4 hộp sữa Vinamilk 180ml", "Nước giặt OMO Matic 3.6kg", "Thùng 24 lon Coca-Cola",
            "Nước rửa chén Sunlight", "Dầu gội Clear Men 630g"
        };

        var categoryFaker = new Faker<Category>()
            .RuleFor(c => c.Id, _ => Guid.NewGuid())
            .RuleFor(c => c.Name, f => f.PickRandom(categoryNames))
            .RuleFor(c => c.Description, f => f.Lorem.Sentence());

        var categories = categoryFaker.Generate(7);
        context.Categories.AddRange(categories);
        await context.SaveChangesAsync();

        var productFaker = new Faker<Product>()
            .RuleFor(p => p.Id, _ => Guid.NewGuid())
            .RuleFor(p => p.Name, f => f.PickRandom(productNames) + " " + f.Random.AlphaNumeric(3).ToUpper())
            .RuleFor(p => p.SKU, f => "SKU" + f.Commerce.Ean8())
            .RuleFor(p => p.Barcode, f => f.Commerce.Ean13())
            .RuleFor(p => p.Price, f => Math.Round((decimal)(f.Random.Number(150, 20000) * 100), 2))
            .RuleFor(p => p.CategoryId, f => f.PickRandom(categories).Id);

        var products = productFaker.Generate(100);
        context.Products.AddRange(products);
        await context.SaveChangesAsync();
    }
}