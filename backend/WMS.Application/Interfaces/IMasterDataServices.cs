using WMS.Application.DTOs.MasterData;

namespace WMS.Application.Interfaces;

public interface IWarehouseService
{
    Task<List<WarehouseDto>> GetAllAsync();
    Task<WarehouseDto?> GetByIdAsync(Guid id);
    Task<WarehouseDto> CreateAsync(CreateWarehouseRequest request);
    Task<WarehouseDto> UpdateAsync(Guid id, UpdateWarehouseRequest request);
    Task DeleteAsync(Guid id);
}

public interface IZoneService
{
    Task<List<ZoneDto>> GetAllAsync(Guid? warehouseId = null);
    Task<ZoneDto?> GetByIdAsync(Guid id);
    Task<ZoneDto> CreateAsync(CreateZoneRequest request);
    Task<ZoneDto> UpdateAsync(Guid id, UpdateZoneRequest request);
    Task DeleteAsync(Guid id);
}

public interface ICategoryService
{
    Task<List<CategoryDto>> GetAllAsync();
    Task<CategoryDto?> GetByIdAsync(Guid id);
    Task<CategoryDto> CreateAsync(CreateCategoryRequest request);
    Task<CategoryDto> UpdateAsync(Guid id, UpdateCategoryRequest request);
    Task DeleteAsync(Guid id);
}

public interface IProductService
{
    Task<List<ProductDto>> GetAllAsync(string? search = null, Guid? categoryId = null);
    Task<ProductDto?> GetByIdAsync(Guid id);
    Task<ProductDto?> GetByBarcodeAsync(string barcode);
    Task<ProductDto> CreateAsync(CreateProductRequest request);
    Task<ProductDto> UpdateAsync(Guid id, UpdateProductRequest request);
    Task DeleteAsync(Guid id);
}

public interface ISupplierService
{
    Task<List<SupplierDto>> GetAllAsync();
    Task<SupplierDto?> GetByIdAsync(Guid id);
    Task<SupplierDto> CreateAsync(CreateSupplierRequest request);
    Task<SupplierDto> UpdateAsync(Guid id, UpdateSupplierRequest request);
    Task DeleteAsync(Guid id);
}

public interface ICustomerService
{
    Task<List<CustomerDto>> GetAllAsync();
    Task<CustomerDto?> GetByIdAsync(Guid id);
    Task<CustomerDto> CreateAsync(CreateCustomerRequest request);
    Task<CustomerDto> UpdateAsync(Guid id, UpdateCustomerRequest request);
    Task DeleteAsync(Guid id);
}
