using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using WMS.Domain.Entities;
using Bogus;

namespace WMS.Infrastructure.Data;

/// <summary>
/// DbInitializer: Seed dữ liệu khởi tạo hệ thống.
/// Chỉ sử dụng 3 Roles: Admin, QA_QC, Staff.
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
            // FIX BUG 2: Thêm permission mã quyền cho Dashboard KPI
            // QA_QC cần quyền này để gọi API Analytics không bị 403
            ("view_dashboard_kpi",      "Analytics"),
            // approve_qc: Được dùng trong ReceiptsController.SaveFromOcr - cần seed
            ("approve_qc",              "Receipt"),
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

        // QA_QC: Quyền OCR, duyệt phiếu, xem tồn kho và xem Dashboard KPI
        Grant(qaQc,
            "view_receipt",
            "approve_qc_receipt",
            "approve_ocr_receipt",
            "approve_qc",           // Duyệt và lưu kết quả OCR
            "save_from_ocr",
            "run_ocr",
            "view_inventory",
            "view_stock_summary",
            "view_transactions",
            "view_issue",
            // FIX BUG 2: Gán quyền xem Dashboard KPI cho QA_QC
            "view_dashboard_kpi"
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
    // STEP 5: Master Data (Products, Categories, v.v.) - Đồ Điện Tử
    // ══════════════════════════════════════════════════════════════════════════
    private static async Task EnsureMasterDataAsync(ApplicationDbContext context)
    {
        // Kiểm tra xem đã có dữ liệu xịn chưa (chứa chữ iPhone)
        if (await context.Products.AnyAsync(p => p.Name.Contains("iPhone"))) return;

        // Xóa SẠCH dữ liệu rác cũ để tránh dính Foreign Key
        context.InventoryTransactions.RemoveRange(context.InventoryTransactions);
        context.Inventories.RemoveRange(context.Inventories);
        context.IssueDetails.RemoveRange(context.IssueDetails);
        context.Issues.RemoveRange(context.Issues);
        context.ReceiptDetails.RemoveRange(context.ReceiptDetails);
        context.Receipts.RemoveRange(context.Receipts);
        context.Products.RemoveRange(context.Products);
        context.Categories.RemoveRange(context.Categories);
        await context.SaveChangesAsync();

        // 1. Tạo Danh Mục (Categories)
        var categoriesDict = new Dictionary<string, Category>
        {
            { "Phone", new Category { Id = Guid.NewGuid(), Name = "Điện thoại & Tablet", Description = "Thiết bị di động thông minh" } },
            { "Laptop", new Category { Id = Guid.NewGuid(), Name = "Laptop & PC", Description = "Máy tính xách tay và máy bộ" } },
            { "Accessories", new Category { Id = Guid.NewGuid(), Name = "Phụ kiện", Description = "Cáp, sạc, ốp lưng, giá đỡ" } },
            { "Audio", new Category { Id = Guid.NewGuid(), Name = "Thiết bị âm thanh", Description = "Tai nghe, loa bluetooth" } },
            { "Peripherals", new Category { Id = Guid.NewGuid(), Name = "Linh kiện & Phụ kiện PC", Description = "Chuột, bàn phím, màn hình, ổ cứng" } },
            { "SmartHome", new Category { Id = Guid.NewGuid(), Name = "Smart Home & Mạng", Description = "Camera, Router Wifi, thiết bị thông minh" } }
        };

        context.Categories.AddRange(categoriesDict.Values);
        await context.SaveChangesAsync();

        // 2. Danh sách Sản Phẩm Đồ Điện Tử Thực Tế
        var products = new List<Product>
        {
            // Điện thoại & Tablet
            new Product { Id = Guid.NewGuid(), Name = "iPhone 15 Pro Max 256GB Titan", SKU = "IP15PM-256-TI", Barcode = "8801234567890", Price = 29500000m, CategoryId = categoriesDict["Phone"].Id },
            { new Product { Id = Guid.NewGuid(), Name = "Samsung Galaxy S24 Ultra 512GB", SKU = "SS-S24U-512", Barcode = "8809876543210", Price = 31990000m, CategoryId = categoriesDict["Phone"].Id } },
            { new Product { Id = Guid.NewGuid(), Name = "iPad Pro M4 11-inch Wifi 256GB", SKU = "IPAD-M4-11-256", Barcode = "8801122334455", Price = 25990000m, CategoryId = categoriesDict["Phone"].Id } },
            
            // Laptop
            { new Product { Id = Guid.NewGuid(), Name = "MacBook Pro 14 M3 Pro 18GB/512GB", SKU = "MAC-14-M3P", Barcode = "8805566778899", Price = 48500000m, CategoryId = categoriesDict["Laptop"].Id } },
            { new Product { Id = Guid.NewGuid(), Name = "Laptop Dell XPS 15 9530 Core i7", SKU = "DELL-XPS9530", Barcode = "8809988776655", Price = 42000000m, CategoryId = categoriesDict["Laptop"].Id } },
            { new Product { Id = Guid.NewGuid(), Name = "Laptop ASUS ROG Zephyrus G14", SKU = "ASUS-ROG-G14", Barcode = "8804433221100", Price = 38990000m, CategoryId = categoriesDict["Laptop"].Id } },

            // Phụ kiện (Cáp, sạc)
            { new Product { Id = Guid.NewGuid(), Name = "Củ sạc nhanh Anker Nano II 65W", SKU = "ANKER-NANO-65W", Barcode = "8801020304050", Price = 850000m, CategoryId = categoriesDict["Accessories"].Id } },
            { new Product { Id = Guid.NewGuid(), Name = "Cáp bọc dù Baseus Type-C to Type-C 100W 2m", SKU = "BASEUS-C2C-100W", Barcode = "8806070809010", Price = 150000m, CategoryId = categoriesDict["Accessories"].Id } },
            { new Product { Id = Guid.NewGuid(), Name = "Sạc dự phòng Ugreen 20000mAh 130W", SKU = "UGREEN-PB-20K", Barcode = "8801212121212", Price = 1250000m, CategoryId = categoriesDict["Accessories"].Id } },

            // Âm thanh
            { new Product { Id = Guid.NewGuid(), Name = "Tai nghe Bluetooth Sony WH-1000XM5", SKU = "SONY-WH1000XM5", Barcode = "8803434343434", Price = 7490000m, CategoryId = categoriesDict["Audio"].Id } },
            { new Product { Id = Guid.NewGuid(), Name = "AirPods Pro (Gen 2) USB-C", SKU = "AIRPODS-PRO2-C", Barcode = "8805656565656", Price = 5890000m, CategoryId = categoriesDict["Audio"].Id } },
            { new Product { Id = Guid.NewGuid(), Name = "Loa Bluetooth Marshall Emberton II", SKU = "MARSHALL-EMB2", Barcode = "8807878787878", Price = 3990000m, CategoryId = categoriesDict["Audio"].Id } },

            // Linh kiện & Phụ kiện PC
            { new Product { Id = Guid.NewGuid(), Name = "Màn hình Dell UltraSharp U2723QE 27inch 4K", SKU = "DELL-U2723QE", Barcode = "8809090909090", Price = 12500000m, CategoryId = categoriesDict["Peripherals"].Id } },
            { new Product { Id = Guid.NewGuid(), Name = "Bàn phím cơ Keychron K2 Pro", SKU = "KEYCHRON-K2P", Barcode = "8802323232323", Price = 2350000m, CategoryId = categoriesDict["Peripherals"].Id } },
            { new Product { Id = Guid.NewGuid(), Name = "Chuột không dây Logitech MX Master 3S", SKU = "LOGI-MXM3S", Barcode = "8804545454545", Price = 2590000m, CategoryId = categoriesDict["Peripherals"].Id } },
            { new Product { Id = Guid.NewGuid(), Name = "Ổ cứng SSD Samsung 990 Pro 1TB PCIe 4.0", SKU = "SS-990PRO-1TB", Barcode = "8806767676767", Price = 2850000m, CategoryId = categoriesDict["Peripherals"].Id } },

            // Smart Home & Mạng
            { new Product { Id = Guid.NewGuid(), Name = "Router Wifi 6 Asus RT-AX55", SKU = "ASUS-RTAX55", Barcode = "8808989898989", Price = 1350000m, CategoryId = categoriesDict["SmartHome"].Id } },
            { new Product { Id = Guid.NewGuid(), Name = "Camera an ninh thông minh Ezviz C6N 1080p", SKU = "EZVIZ-C6N", Barcode = "8801010101010", Price = 450000m, CategoryId = categoriesDict["SmartHome"].Id } },
            { new Product { Id = Guid.NewGuid(), Name = "Ổ cắm điện thông minh Xiaomi Smart Plug", SKU = "XIAOMI-PLUG", Barcode = "8802020202020", Price = 250000m, CategoryId = categoriesDict["SmartHome"].Id } }
        };

        context.Products.AddRange(products);
        await context.SaveChangesAsync();
    }
}