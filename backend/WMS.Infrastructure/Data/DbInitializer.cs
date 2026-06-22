using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using WMS.Domain.Entities;

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
        
        var (warehouse, zoneA, zoneB) = await EnsureMasterDataAsync(context);
        await EnsureUsersAsync(context, adminRole, qaRole, staffRole, warehouse);
        await EnsureTransactionsAsync(context, warehouse, zoneA, zoneB);
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
    // STEP 4: Users
    // ══════════════════════════════════════════════════════════════════════════
    private static async Task EnsureUsersAsync(ApplicationDbContext context, Role adminRole, Role qaRole, Role staffRole, Warehouse warehouse)
    {
        if (!await context.Users.AnyAsync(u => u.Username == "admin"))
        {
            context.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                RoleId = adminRole.Id,
                WarehouseId = null
            });
        }

        if (!await context.Users.AnyAsync(u => u.Username == "qa_user"))
        {
            context.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                Username = "qa_user",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("qa123"),
                RoleId = qaRole.Id,
                WarehouseId = warehouse.Id
            });
        }

        if (!await context.Users.AnyAsync(u => u.Username == "staff_user"))
        {
            context.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                Username = "staff_user",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("staff123"),
                RoleId = staffRole.Id,
                WarehouseId = warehouse.Id
            });
        }

        await context.SaveChangesAsync();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 5: Master Data (Warehouses, Zones, Products, Categories, v.v.)
    // ══════════════════════════════════════════════════════════════════════════
    private static async Task<(Warehouse warehouse, Zone zoneA, Zone zoneB)> EnsureMasterDataAsync(ApplicationDbContext context)
    {
        Warehouse warehouse = await context.Warehouses.FirstOrDefaultAsync();
        if (warehouse == null)
        {
            warehouse = new Warehouse { Id = Guid.NewGuid(), Name = "Kho tổng Hà Nội", Location = "Thanh Xuân, Hà Nội" };
            context.Warehouses.Add(warehouse);
            await context.SaveChangesAsync();
        }

        var zones = await context.Zones.Where(z => z.WarehouseId == warehouse.Id).ToListAsync();
        var zoneA = zones.FirstOrDefault(z => z.Name == "Khu A - Điện tử");
        if (zoneA == null)
        {
            zoneA = new Zone { Id = Guid.NewGuid(), WarehouseId = warehouse.Id, Name = "Khu A - Điện tử" };
            context.Zones.Add(zoneA);
        }

        var zoneB = zones.FirstOrDefault(z => z.Name == "Khu B - Gia dụng");
        if (zoneB == null)
        {
            zoneB = new Zone { Id = Guid.NewGuid(), WarehouseId = warehouse.Id, Name = "Khu B - Gia dụng" };
            context.Zones.Add(zoneB);
        }
        await context.SaveChangesAsync();

        if (!await context.Categories.AnyAsync())
        {
            var catDienTu = new Category { Id = Guid.NewGuid(), Name = "Điện tử", Description = "Điện thoại, máy tính, TV..." };
            var catGiaDung = new Category { Id = Guid.NewGuid(), Name = "Gia dụng", Description = "Đồ dùng nhà bếp, quạt..." };
            context.Categories.AddRange(catDienTu, catGiaDung);
            await context.SaveChangesAsync();
        }

        if (!await context.Products.AnyAsync())
        {
            var catDienTu = await context.Categories.FirstOrDefaultAsync(c => c.Name == "Điện tử");
            var catGiaDung = await context.Categories.FirstOrDefaultAsync(c => c.Name == "Gia dụng");
            if (catDienTu != null && catGiaDung != null)
            {
                context.Products.AddRange(
                    new Product { Id = Guid.NewGuid(), Name = "iPhone 15 Pro Max 256GB", SKU = "IP15PM-256", Barcode = "8931234567890", Price = 34000000, CategoryId = catDienTu.Id },
                    new Product { Id = Guid.NewGuid(), Name = "Smart Tivi Samsung 65 inch", SKU = "SS-TV65", Barcode = "8931234567891", Price = 15000000, CategoryId = catDienTu.Id },
                    new Product { Id = Guid.NewGuid(), Name = "Nồi chiên không dầu Philips", SKU = "PH-NCKD", Barcode = "8931234567892", Price = 2500000, CategoryId = catGiaDung.Id },
                    new Product { Id = Guid.NewGuid(), Name = "Lò vi sóng Sharp 20L", SKU = "SH-LVS20", Barcode = "8931234567893", Price = 1800000, CategoryId = catGiaDung.Id }
                );
                await context.SaveChangesAsync();
            }
        }

        if (!await context.Suppliers.AnyAsync())
        {
            context.Suppliers.AddRange(
                new Supplier { Id = Guid.NewGuid(), Name = "Công ty TNHH Điện tử VN", ContactPerson = "Nguyễn Văn A", Phone = "0987654321", Address = "123 Đường ABC, Hà Nội" },
                new Supplier { Id = Guid.NewGuid(), Name = "Nhà phân phối Gia dụng xanh", ContactPerson = "Trần Thị B", Phone = "0912345678", Address = "456 Đường XYZ, Hà Nội" }
            );
            await context.SaveChangesAsync();
        }

        if (!await context.Customers.AnyAsync())
        {
            context.Customers.AddRange(
                new Customer { Id = Guid.NewGuid(), Name = "Siêu thị Điện máy Xanh", Phone = "18001061", DeliveryAddress = "789 Đường LMN, Hà Nội" },
                new Customer { Id = Guid.NewGuid(), Name = "Cửa hàng tiện lợi 247", Phone = "0241234567", DeliveryAddress = "101 Đường PQR, Hà Nội" }
            );
            await context.SaveChangesAsync();
        }
        return (warehouse, zoneA, zoneB);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 6: Transactions (Receipts, Issues, Inventory)
    // ══════════════════════════════════════════════════════════════════════════
    private static async Task EnsureTransactionsAsync(ApplicationDbContext context, Warehouse warehouse, Zone zoneA, Zone zoneB)
    {
        if (await context.Receipts.AnyAsync()) return;

        var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Username == "admin");
        var supplier = await context.Suppliers.FirstOrDefaultAsync();
        var customer = await context.Customers.FirstOrDefaultAsync();
        var products = await context.Products.Take(4).ToListAsync();

        if (adminUser == null || supplier == null || customer == null || products.Count < 2) 
        {
            Console.WriteLine($"[Seed] Missing required entities for transactions. Admin: {adminUser!=null}, Supplier: {supplier!=null}, Customer: {customer!=null}, Products: {products.Count}");
            return;
        }

        // 1. Tạo Phiếu Nhập 1 (Completed)
        var receipt1 = new Receipt
        {
            Id = Guid.NewGuid(),
            WarehouseId = warehouse.Id,
            SupplierId = supplier.Id,
            CreatedByUserId = adminUser.Id,
            Status = WMS.Domain.Enums.ReceiptStatus.Completed,
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };
        context.Receipts.Add(receipt1);

        var r1d1 = new ReceiptDetail { Id = Guid.NewGuid(), ReceiptId = receipt1.Id, ProductId = products[0].Id, ZoneId = zoneA.Id, ExpectedQuantity = 100, ActualQuantity = 100, UnitPrice = 30000000 };
        var r1d2 = new ReceiptDetail { Id = Guid.NewGuid(), ReceiptId = receipt1.Id, ProductId = products[1].Id, ZoneId = zoneA.Id, ExpectedQuantity = 50, ActualQuantity = 50, UnitPrice = 12000000 };
        context.ReceiptDetails.AddRange(r1d1, r1d2);

        // Inventory cho Receipt 1
        var inv1 = new Inventory { Id = Guid.NewGuid(), WarehouseId = warehouse.Id, ZoneId = zoneA.Id, ProductId = products[0].Id, Quantity = 100, LastRestockedDate = DateTime.UtcNow.AddDays(-2) };
        var inv2 = new Inventory { Id = Guid.NewGuid(), WarehouseId = warehouse.Id, ZoneId = zoneA.Id, ProductId = products[1].Id, Quantity = 50, LastRestockedDate = DateTime.UtcNow.AddDays(-2) };
        context.Inventories.AddRange(inv1, inv2);

        // Transaction cho Receipt 1
        context.InventoryTransactions.AddRange(
            new InventoryTransaction { Id = Guid.NewGuid(), ProductId = products[0].Id, ZoneId = zoneA.Id, QuantityChange = 100, TransactionType = WMS.Domain.Enums.TransactionType.Inbound, ReferenceId = receipt1.Id, CreatedAt = receipt1.CreatedAt },
            new InventoryTransaction { Id = Guid.NewGuid(), ProductId = products[1].Id, ZoneId = zoneA.Id, QuantityChange = 50, TransactionType = WMS.Domain.Enums.TransactionType.Inbound, ReferenceId = receipt1.Id, CreatedAt = receipt1.CreatedAt }
        );

        // 2. Tạo Phiếu Nhập 2 (Draft)
        var receipt2 = new Receipt
        {
            Id = Guid.NewGuid(),
            WarehouseId = warehouse.Id,
            SupplierId = supplier.Id,
            CreatedByUserId = adminUser.Id,
            Status = WMS.Domain.Enums.ReceiptStatus.Draft,
            CreatedAt = DateTime.UtcNow
        };
        context.Receipts.Add(receipt2);
        context.ReceiptDetails.AddRange(
            new ReceiptDetail { Id = Guid.NewGuid(), ReceiptId = receipt2.Id, ProductId = products[2].Id, ZoneId = null, ExpectedQuantity = 200, ActualQuantity = 0, UnitPrice = 2000000 },
            new ReceiptDetail { Id = Guid.NewGuid(), ReceiptId = receipt2.Id, ProductId = products[3].Id, ZoneId = null, ExpectedQuantity = 100, ActualQuantity = 0, UnitPrice = 1500000 }
        );

        // 3. Tạo Phiếu Xuất 1 (Handover - Đã hoàn thành)
        var issue1 = new Issue
        {
            Id = Guid.NewGuid(),
            WarehouseId = warehouse.Id,
            CustomerId = customer.Id,
            CreatedByUserId = adminUser.Id,
            Status = WMS.Domain.Enums.IssueStatus.Handover,
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };
        context.Issues.Add(issue1);

        var i1d1 = new IssueDetail { Id = Guid.NewGuid(), IssueId = issue1.Id, ProductId = products[0].Id, ZoneId = zoneA.Id, QuantityToPick = 2, PickedQuantity = 2 };
        context.IssueDetails.Add(i1d1);

        // Trừ tồn kho
        inv1.Quantity -= 2;

        context.InventoryTransactions.Add(
            new InventoryTransaction { Id = Guid.NewGuid(), ProductId = products[0].Id, ZoneId = zoneA.Id, QuantityChange = -2, TransactionType = WMS.Domain.Enums.TransactionType.Outbound, ReferenceId = issue1.Id, CreatedAt = issue1.CreatedAt }
        );

        // 4. Tạo Phiếu Xuất 2 (Pending)
        var issue2 = new Issue
        {
            Id = Guid.NewGuid(),
            WarehouseId = warehouse.Id,
            CustomerId = customer.Id,
            CreatedByUserId = adminUser.Id,
            Status = WMS.Domain.Enums.IssueStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        context.Issues.Add(issue2);
        context.IssueDetails.Add(
            new IssueDetail { Id = Guid.NewGuid(), IssueId = issue2.Id, ProductId = products[1].Id, ZoneId = null, QuantityToPick = 5, PickedQuantity = 0 }
        );

        await context.SaveChangesAsync();
    }
}