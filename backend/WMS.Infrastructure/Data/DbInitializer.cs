using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using WMS.Domain.Entities;
using Bogus; // Bổ sung thư viện Bogus

namespace WMS.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        await context.Database.MigrateAsync();

        var adminRole = await EnsureRolesAsync(context);
        await EnsureAdminUserAsync(context, adminRole);
        
        // Kích hoạt luồng bơm dữ liệu nền (Master Data)
        await EnsureMasterDataAsync(context);
    }

    private static async Task<Role> EnsureRolesAsync(ApplicationDbContext context)
    {
        var existingRoles = await context.Roles.ToListAsync();
        var adminRole = existingRoles.FirstOrDefault(role => role.Name == "Admin");

        if (adminRole == null)
        {
            adminRole = new Role
            {
                Id = Guid.NewGuid(),
                Name = "Admin",
                Description = "System administrator"
            };
            context.Roles.Add(adminRole);
        }

        if (existingRoles.All(role => role.Name != "QA_QC"))
        {
            context.Roles.Add(new Role
            {
                Id = Guid.NewGuid(),
                Name = "QA_QC",
                Description = "Quality assurance"
            });
        }

        if (existingRoles.All(role => role.Name != "Staff"))
        {
            context.Roles.Add(new Role
            {
                Id = Guid.NewGuid(),
                Name = "Staff",
                Description = "Warehouse staff"
            });
        }

        if (existingRoles.All(role => role.Name != "Manager"))
        {
            context.Roles.Add(new Role
            {
                Id = Guid.NewGuid(),
                Name = "Manager",
                Description = "Warehouse manager"
            });
        }

        await context.SaveChangesAsync();
        return adminRole;
    }

    private static async Task EnsureAdminUserAsync(ApplicationDbContext context, Role adminRole)
    {
        var hasAdmin = await context.Users.AnyAsync(u => u.Username == "admin");
        if (hasAdmin)
        {
            return;
        }

        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            RoleId = adminRole.Id,
            WarehouseId = null
        };

        context.Users.Add(adminUser);
        await context.SaveChangesAsync();
    }

    // HÀM MỚI: Bơm dữ liệu nền (Master Data)
    private static async Task EnsureMasterDataAsync(ApplicationDbContext context)
    {
        // Kiểm tra nếu database đã có Sản phẩm thì bỏ qua để tránh duplicate
        if (await context.Products.AnyAsync()) return;

        // 1. Tập dữ liệu mồi tiếng Việt cho 2 ngành hàng: Gia dụng & FMCG
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

        // 2. Sinh Danh mục
        var categoryFaker = new Faker<Category>()
            .RuleFor(c => c.Id, f => Guid.NewGuid()) // Đồng bộ khóa chính Guid
            .RuleFor(c => c.Name, f => f.PickRandom(categoryNames));

        var categories = categoryFaker.Generate(7);
        context.Categories.AddRange(categories);
        await context.SaveChangesAsync(); 

        // 3. Sinh 100 Sản phẩm ngẫu nhiên dựa trên tập dữ liệu mồi
        var productFaker = new Faker<Product>()
            .RuleFor(p => p.Id, f => Guid.NewGuid()) // Đồng bộ khóa chính Guid
            .RuleFor(p => p.Name, f => f.PickRandom(productNames) + " " + f.Random.AlphaNumeric(3).ToUpper()) 
            .RuleFor(p => p.SKU, f => "SKU" + f.Commerce.Ean8())    
            .RuleFor(p => p.Barcode, f => f.Commerce.Ean13())       
            .RuleFor(p => p.Price, f => (decimal)(f.Random.Number(150, 20000) * 100))
            .RuleFor(p => p.CategoryId, f => f.PickRandom(categories).Id); // Gắn random vào 7 danh mục trên

        var products = productFaker.Generate(100);
        context.Products.AddRange(products);
        
        await context.SaveChangesAsync();
    }
}