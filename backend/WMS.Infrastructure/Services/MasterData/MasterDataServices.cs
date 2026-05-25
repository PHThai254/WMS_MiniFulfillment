using Microsoft.EntityFrameworkCore;
using WMS.Application.DTOs.MasterData;
using WMS.Application.Interfaces;
using WMS.Domain.Entities;
using WMS.Infrastructure.Data;

namespace WMS.Infrastructure.Services.MasterData;

public class WarehouseService : IWarehouseService
{
    private readonly ApplicationDbContext _db;
    public WarehouseService(ApplicationDbContext db) => _db = db;

    public async Task<List<WarehouseDto>> GetAllAsync() =>
        await _db.Warehouses.AsNoTracking()
            .Select(w => new WarehouseDto(w.Id, w.Name, w.Location, 0))
            .ToListAsync();

    public async Task<WarehouseDto?> GetByIdAsync(Guid id)
    {
        var w = await _db.Warehouses.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return w is null ? null : new WarehouseDto(w.Id, w.Name, w.Location, 0);
    }

    public async Task<WarehouseDto> CreateAsync(CreateWarehouseRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) throw new ArgumentException("Tên kho không được để trống.");
        var warehouse = new Warehouse { Id = Guid.NewGuid(), Name = request.Name, Location = request.Location };
        _db.Warehouses.Add(warehouse);
        await _db.SaveChangesAsync();
        return new WarehouseDto(warehouse.Id, warehouse.Name, warehouse.Location, 0);
    }

    public async Task<WarehouseDto> UpdateAsync(Guid id, UpdateWarehouseRequest request)
    {
        var w = await _db.Warehouses.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy kho.");
        w.Name = request.Name; w.Location = request.Location;
        await _db.SaveChangesAsync();
        return new WarehouseDto(w.Id, w.Name, w.Location, 0);
    }

    public async Task DeleteAsync(Guid id)
    {
        var w = await _db.Warehouses.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy kho.");
        _db.Warehouses.Remove(w);
        await _db.SaveChangesAsync();
    }
}

public class ZoneService : IZoneService
{
    private readonly ApplicationDbContext _db;
    public ZoneService(ApplicationDbContext db) => _db = db;

    public async Task<List<ZoneDto>> GetAllAsync(Guid? warehouseId = null)
    {
        var query = _db.Zones.Include(z => z.Warehouse).AsNoTracking();
        if (warehouseId.HasValue) query = query.Where(z => z.WarehouseId == warehouseId.Value);
        return await query.Select(z => new ZoneDto(z.Id, z.WarehouseId, z.Warehouse!.Name, z.Name)).ToListAsync();
    }

    public async Task<ZoneDto?> GetByIdAsync(Guid id)
    {
        var z = await _db.Zones.Include(z => z.Warehouse).AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return z is null ? null : new ZoneDto(z.Id, z.WarehouseId, z.Warehouse?.Name ?? string.Empty, z.Name);
    }

    public async Task<ZoneDto> CreateAsync(CreateZoneRequest request)
    {
        if (!await _db.Warehouses.AnyAsync(w => w.Id == request.WarehouseId)) throw new ArgumentException("Kho không tồn tại.");
        var zone = new Zone { Id = Guid.NewGuid(), WarehouseId = request.WarehouseId, Name = request.Name };
        _db.Zones.Add(zone);
        await _db.SaveChangesAsync();
        var warehouse = await _db.Warehouses.FindAsync(request.WarehouseId);
        return new ZoneDto(zone.Id, zone.WarehouseId, warehouse?.Name ?? string.Empty, zone.Name);
    }

    public async Task<ZoneDto> UpdateAsync(Guid id, UpdateZoneRequest request)
    {
        var z = await _db.Zones.Include(z => z.Warehouse).FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy zone.");
        z.Name = request.Name;
        await _db.SaveChangesAsync();
        return new ZoneDto(z.Id, z.WarehouseId, z.Warehouse?.Name ?? string.Empty, z.Name);
    }

    public async Task DeleteAsync(Guid id)
    {
        var z = await _db.Zones.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy zone.");
        _db.Zones.Remove(z);
        await _db.SaveChangesAsync();
    }
}

public class CategoryService : ICategoryService
{
    private readonly ApplicationDbContext _db;
    public CategoryService(ApplicationDbContext db) => _db = db;

    public async Task<List<CategoryDto>> GetAllAsync() =>
        await _db.Categories.AsNoTracking()
            .Select(c => new CategoryDto(c.Id, c.Name, c.Products.Count)).ToListAsync();

    public async Task<CategoryDto?> GetByIdAsync(Guid id)
    {
        var c = await _db.Categories.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return c is null ? null : new CategoryDto(c.Id, c.Name, 0);
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) throw new ArgumentException("Tên danh mục không được để trống.");
        var cat = new Category { Id = Guid.NewGuid(), Name = request.Name };
        _db.Categories.Add(cat);
        await _db.SaveChangesAsync();
        return new CategoryDto(cat.Id, cat.Name, 0);
    }

    public async Task<CategoryDto> UpdateAsync(Guid id, UpdateCategoryRequest request)
    {
        var cat = await _db.Categories.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy danh mục.");
        cat.Name = request.Name;
        await _db.SaveChangesAsync();
        return new CategoryDto(cat.Id, cat.Name, 0);
    }

    public async Task DeleteAsync(Guid id)
    {
        var cat = await _db.Categories.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy danh mục.");
        _db.Categories.Remove(cat);
        await _db.SaveChangesAsync();
    }
}

public class ProductService : IProductService
{
    private readonly ApplicationDbContext _db;
    public ProductService(ApplicationDbContext db) => _db = db;

    public async Task<List<ProductDto>> GetAllAsync(string? search = null, Guid? categoryId = null)
    {
        var query = _db.Products.Include(p => p.Category).AsNoTracking();
        if (!string.IsNullOrEmpty(search))
            query = query.Where(p => p.Name.Contains(search) || p.SKU.Contains(search) || p.Barcode.Contains(search));
        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId.Value);
            
        // Đã bổ sung p.Price vào tham số thứ 5
        return await query.Select(p => new ProductDto(p.Id, p.SKU, p.Barcode, p.Name, p.Price, p.CategoryId, p.Category!.Name, p.ImagePath)).ToListAsync();
    }

    public async Task<ProductDto?> GetByIdAsync(Guid id)
    {
        var p = await _db.Products.Include(p => p.Category).AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        // Đã bổ sung p.Price
        return p is null ? null : new ProductDto(p.Id, p.SKU, p.Barcode, p.Name, p.Price, p.CategoryId, p.Category?.Name ?? string.Empty, p.ImagePath);
    }

    public async Task<ProductDto?> GetByBarcodeAsync(string barcode)
    {
        var p = await _db.Products.Include(p => p.Category).AsNoTracking().FirstOrDefaultAsync(x => x.Barcode == barcode);
        // Đã bổ sung p.Price
        return p is null ? null : new ProductDto(p.Id, p.SKU, p.Barcode, p.Name, p.Price, p.CategoryId, p.Category?.Name ?? string.Empty, p.ImagePath);
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest request)
    {
        var barcode = GenerateBarcode();
        var sku = string.IsNullOrEmpty(request.SKU) ? $"SKU-{DateTime.Now:yyyyMMddHHmmss}" : request.SKU;
        
        // Cập nhật Entity: Bổ sung Price = request.Price
        var product = new Product { Id = Guid.NewGuid(), Name = request.Name, SKU = sku, Barcode = barcode, Price = request.Price, CategoryId = request.CategoryId };
        
        _db.Products.Add(product);
        await _db.SaveChangesAsync();
        var cat = await _db.Categories.FindAsync(request.CategoryId);
        
        // Đã bổ sung product.Price
        return new ProductDto(product.Id, product.SKU, product.Barcode, product.Name, product.Price, product.CategoryId, cat?.Name ?? string.Empty, product.ImagePath);
    }

    public async Task<ProductDto> UpdateAsync(Guid id, UpdateProductRequest request)
    {
        var product = await _db.Products.Include(p => p.Category).FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy sản phẩm.");

        // Cập nhật Entity: Bổ sung gán product.Price = request.Price
        product.Name = request.Name; product.SKU = request.SKU ?? string.Empty; product.CategoryId = request.CategoryId; product.Price = request.Price;
        
        await _db.SaveChangesAsync();
        
        // Đã bổ sung product.Price
        return new ProductDto(product.Id, product.SKU ?? string.Empty, product.Barcode ?? string.Empty, product.Name, product.Price, product.CategoryId, product.Category?.Name ?? string.Empty, product.ImagePath);
    }

    public async Task DeleteAsync(Guid id)
    {
        var product = await _db.Products.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy sản phẩm.");
        _db.Products.Remove(product);
        await _db.SaveChangesAsync();
    }

    private static string GenerateBarcode()
    {
        var random = new Random();
        return string.Concat(Enumerable.Range(0, 12).Select(_ => random.Next(0, 10).ToString()));
    }
}

public class SupplierService : ISupplierService
{
    private readonly ApplicationDbContext _db;
    public SupplierService(ApplicationDbContext db) => _db = db;

    public async Task<List<SupplierDto>> GetAllAsync() =>
        await _db.Suppliers.AsNoTracking()
            .Select(s => new SupplierDto(s.Id, s.Name, s.ContactPerson, s.Phone, s.Address)).ToListAsync();

    public async Task<SupplierDto?> GetByIdAsync(Guid id)
    {
        var s = await _db.Suppliers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return s is null ? null : new SupplierDto(s.Id, s.Name, s.ContactPerson, s.Phone, s.Address);
    }

    public async Task<SupplierDto> CreateAsync(CreateSupplierRequest request)
    {
        var s = new Supplier { Id = Guid.NewGuid(), Name = request.Name, ContactPerson = request.ContactPerson, Phone = request.Phone, Address = request.Address };
        _db.Suppliers.Add(s);
        await _db.SaveChangesAsync();
        return new SupplierDto(s.Id, s.Name, s.ContactPerson, s.Phone, s.Address);
    }

    public async Task<SupplierDto> UpdateAsync(Guid id, UpdateSupplierRequest request)
    {
        var s = await _db.Suppliers.FirstOrDefaultAsync(x => x.Id == id) ?? throw new KeyNotFoundException("Không tìm thấy nhà cung cấp.");
        s.Name = request.Name; s.ContactPerson = request.ContactPerson; s.Phone = request.Phone; s.Address = request.Address;
        await _db.SaveChangesAsync();
        return new SupplierDto(s.Id, s.Name, s.ContactPerson, s.Phone, s.Address);
    }

    public async Task DeleteAsync(Guid id)
    {
        var s = await _db.Suppliers.FirstOrDefaultAsync(x => x.Id == id) ?? throw new KeyNotFoundException("Không tìm thấy nhà cung cấp.");
        _db.Suppliers.Remove(s);
        await _db.SaveChangesAsync();
    }
}

public class ProductImageService : IProductImageService
{
    private readonly ApplicationDbContext _db;
    private readonly string _uploadsPath;

    public ProductImageService(ApplicationDbContext db)
    {
        _db = db;
        // Use a relative path from current directory (wwwroot/uploads/products)
        _uploadsPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "uploads", "products");
    }

    public async Task<ProductImageUploadResponse> UploadProductImageAsync(Guid productId, Stream imageStream, string fileName)
    {
        // Kiểm tra tồn tại sản phẩm
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == productId)
            ?? throw new KeyNotFoundException("Không tìm thấy sản phẩm.");

        // Kiểm tra file
        if (imageStream == null || imageStream.Length == 0)
            throw new ArgumentException("File ảnh không được để trống.");

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var fileExtension = Path.GetExtension(fileName).ToLower();
        if (!allowedExtensions.Contains(fileExtension))
            throw new ArgumentException($"Chỉ chấp nhận các định dạng: {string.Join(", ", allowedExtensions)}");

        var maxFileSize = 5 * 1024 * 1024; // 5 MB
        if (imageStream.Length > maxFileSize)
            throw new ArgumentException("Kích thước file không được vượt quá 5 MB.");

        // Tạo đường dẫn lưu trữ
        if (!Directory.Exists(_uploadsPath))
            Directory.CreateDirectory(_uploadsPath);

        // Xóa ảnh cũ nếu tồn tại
        if (!string.IsNullOrEmpty(product.ImagePath))
        {
            var oldFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", product.ImagePath.TrimStart('/'));
            if (File.Exists(oldFilePath))
                File.Delete(oldFilePath);
        }

        // Lưu ảnh mới
        var uniqueFileName = $"{productId}_{DateTime.Now:yyyyMMddHHmmss}{fileExtension}";
        var filePath = Path.Combine(_uploadsPath, uniqueFileName);
        
        using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            await imageStream.CopyToAsync(fileStream);
        }

        // Cập nhật đường dẫn ảnh trong DB
        product.ImagePath = $"/uploads/products/{uniqueFileName}";
        await _db.SaveChangesAsync();

        return new ProductImageUploadResponse(
            productId,
            product.ImagePath,
            uniqueFileName,
            "Tải lên ảnh sản phẩm thành công."
        );
    }

    public async Task DeleteProductImageAsync(Guid productId)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == productId)
            ?? throw new KeyNotFoundException("Không tìm thấy sản phẩm.");

        if (string.IsNullOrEmpty(product.ImagePath))
            throw new ArgumentException("Sản phẩm không có ảnh để xóa.");

        // Xóa file vật lý
        var filePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", product.ImagePath.TrimStart('/'));
        if (File.Exists(filePath))
            File.Delete(filePath);

        // Xóa đường dẫn ảnh khỏi DB
        product.ImagePath = null;
        await _db.SaveChangesAsync();
    }
}

public class CustomerService : ICustomerService
{
    private readonly ApplicationDbContext _db;
    public CustomerService(ApplicationDbContext db) => _db = db;

    public async Task<List<CustomerDto>> GetAllAsync() =>
        await _db.Customers.AsNoTracking()
            .Select(c => new CustomerDto(c.Id, c.Name, c.Phone, c.DeliveryAddress)).ToListAsync();

    public async Task<CustomerDto?> GetByIdAsync(Guid id)
    {
        var c = await _db.Customers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return c is null ? null : new CustomerDto(c.Id, c.Name, c.Phone, c.DeliveryAddress);
    }

    public async Task<CustomerDto> CreateAsync(CreateCustomerRequest request)
    {
        var c = new Customer { Id = Guid.NewGuid(), Name = request.Name, Phone = request.Phone, DeliveryAddress = request.DeliveryAddress };
        _db.Customers.Add(c);
        await _db.SaveChangesAsync();
        return new CustomerDto(c.Id, c.Name, c.Phone, c.DeliveryAddress);
    }

    public async Task<CustomerDto> UpdateAsync(Guid id, UpdateCustomerRequest request)
    {
        var c = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id) ?? throw new KeyNotFoundException("Không tìm thấy khách hàng.");
        c.Name = request.Name; c.Phone = request.Phone; c.DeliveryAddress = request.DeliveryAddress;
        await _db.SaveChangesAsync();
        return new CustomerDto(c.Id, c.Name, c.Phone, c.DeliveryAddress);
    }

    public async Task DeleteAsync(Guid id)
    {
        var c = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id) ?? throw new KeyNotFoundException("Không tìm thấy khách hàng.");
        _db.Customers.Remove(c);
        await _db.SaveChangesAsync();
    }
}
