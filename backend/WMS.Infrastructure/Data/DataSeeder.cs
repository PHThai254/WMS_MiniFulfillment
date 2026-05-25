using Bogus;
using Microsoft.EntityFrameworkCore;
using WMS.Domain.Entities;
using WMS.Infrastructure.Data;

public static class DataSeeder
{
    public static void SeedMasterData(ApplicationDbContext context)
    {
        // 1. Kiểm tra xem database đã có dữ liệu chưa. Nếu có rồi thì bỏ qua để tránh trùng lặp.
        if (context.Products.Any()) return; 

        // 2. Cấu hình sinh 10 Danh mục (Category) giả
        var categoryFaker = new Faker<Category>()
            .RuleFor(c => c.Name, f => f.Commerce.Department()); 
            // Bogus sẽ tự bịa ra các tên như "Electronics", "Computers", v.v.

        var categories = categoryFaker.Generate(10);
        context.Categories.AddRange(categories);
        context.SaveChanges(); // Lưu Danh mục trước để lấy ID cấp cho Sản phẩm

        // 3. Cấu hình sinh 100 Sản phẩm (Product) giả, map ngẫu nhiên vào các Danh mục trên
        var productFaker = new Faker<Product>()
            .RuleFor(p => p.Name, f => f.Commerce.ProductName())
            .RuleFor(p => p.SKU, f => f.Commerce.Ean8())    // Sinh mã SKU 8 số
            .RuleFor(p => p.Barcode, f => f.Commerce.Ean13()) // Sinh mã vạch chuẩn 13 số
            .RuleFor(p => p.CategoryId, f => f.PickRandom(categories).Id); // Lấy random ID từ list 10 danh mục

        var products = productFaker.Generate(100);
        context.Products.AddRange(products);
        
        // 4. Đẩy toàn bộ vào SQL Server
        context.SaveChanges();
    }
}