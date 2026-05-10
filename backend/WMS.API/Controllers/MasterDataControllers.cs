using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WMS.Application.DTOs.MasterData;
using WMS.Application.Interfaces;
using WMS.Application.Wrappers;

namespace WMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WarehousesController : ControllerBase
{
    private readonly IWarehouseService _service;
    public WarehousesController(IWarehouseService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<WarehouseDto>>>> GetAll()
    {
        var data = await _service.GetAllAsync();
        return Ok(ApiResponse<List<WarehouseDto>>.Succeeded(data));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<WarehouseDto>>> GetById(Guid id)
    {
        var data = await _service.GetByIdAsync(id);
        if (data is null) return NotFound(ApiResponse<WarehouseDto>.Failed("Không tìm thấy kho."));
        return Ok(ApiResponse<WarehouseDto>.Succeeded(data));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<WarehouseDto>>> Create([FromBody] CreateWarehouseRequest request)
    {
        var data = await _service.CreateAsync(request);
        return Ok(ApiResponse<WarehouseDto>.Succeeded(data, "Tạo kho thành công."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<WarehouseDto>>> Update(Guid id, [FromBody] UpdateWarehouseRequest request)
    {
        var data = await _service.UpdateAsync(id, request);
        return Ok(ApiResponse<WarehouseDto>.Succeeded(data, "Cập nhật kho thành công."));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse<object>.Succeeded(null!, "Xóa kho thành công."));
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ZonesController : ControllerBase
{
    private readonly IZoneService _service;
    public ZonesController(IZoneService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ZoneDto>>>> GetAll([FromQuery] Guid? warehouseId)
    {
        var data = await _service.GetAllAsync(warehouseId);
        return Ok(ApiResponse<List<ZoneDto>>.Succeeded(data));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ZoneDto>>> GetById(Guid id)
    {
        var data = await _service.GetByIdAsync(id);
        if (data is null) return NotFound(ApiResponse<ZoneDto>.Failed("Không tìm thấy zone."));
        return Ok(ApiResponse<ZoneDto>.Succeeded(data));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<ZoneDto>>> Create([FromBody] CreateZoneRequest request)
    {
        var data = await _service.CreateAsync(request);
        return Ok(ApiResponse<ZoneDto>.Succeeded(data, "Tạo zone thành công."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<ZoneDto>>> Update(Guid id, [FromBody] UpdateZoneRequest request)
    {
        var data = await _service.UpdateAsync(id, request);
        return Ok(ApiResponse<ZoneDto>.Succeeded(data, "Cập nhật zone thành công."));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse<object>.Succeeded(null!, "Xóa zone thành công."));
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _service;
    public CategoriesController(ICategoryService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<CategoryDto>>>> GetAll()
    {
        var data = await _service.GetAllAsync();
        return Ok(ApiResponse<List<CategoryDto>>.Succeeded(data));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> Create([FromBody] CreateCategoryRequest request)
    {
        var data = await _service.CreateAsync(request);
        return Ok(ApiResponse<CategoryDto>.Succeeded(data, "Tạo danh mục thành công."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> Update(Guid id, [FromBody] UpdateCategoryRequest request)
    {
        var data = await _service.UpdateAsync(id, request);
        return Ok(ApiResponse<CategoryDto>.Succeeded(data, "Cập nhật danh mục thành công."));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse<object>.Succeeded(null!, "Xóa danh mục thành công."));
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly IProductService _service;
    public ProductsController(IProductService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ProductDto>>>> GetAll([FromQuery] string? search, [FromQuery] Guid? categoryId)
    {
        var data = await _service.GetAllAsync(search, categoryId);
        return Ok(ApiResponse<List<ProductDto>>.Succeeded(data));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> GetById(Guid id)
    {
        var data = await _service.GetByIdAsync(id);
        if (data is null) return NotFound(ApiResponse<ProductDto>.Failed("Không tìm thấy sản phẩm."));
        return Ok(ApiResponse<ProductDto>.Succeeded(data));
    }

    [HttpGet("barcode/{barcode}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> GetByBarcode(string barcode)
    {
        var data = await _service.GetByBarcodeAsync(barcode);
        if (data is null) return NotFound(ApiResponse<ProductDto>.Failed("Không tìm thấy sản phẩm."));
        return Ok(ApiResponse<ProductDto>.Succeeded(data));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Create([FromBody] CreateProductRequest request)
    {
        var data = await _service.CreateAsync(request);
        return Ok(ApiResponse<ProductDto>.Succeeded(data, "Tạo sản phẩm thành công."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Update(Guid id, [FromBody] UpdateProductRequest request)
    {
        var data = await _service.UpdateAsync(id, request);
        return Ok(ApiResponse<ProductDto>.Succeeded(data, "Cập nhật sản phẩm thành công."));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse<object>.Succeeded(null!, "Xóa sản phẩm thành công."));
    }

    [HttpPost("{id:guid}/image")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<ProductImageUploadResponse>>> UploadImage(Guid id, IFormFile image)
    {
        if (image == null || image.Length == 0)
            return BadRequest(ApiResponse<ProductImageUploadResponse>.Failed("File ảnh không được để trống."));

        var imageService = HttpContext.RequestServices.GetRequiredService<IProductImageService>();
        using (var stream = image.OpenReadStream())
        {
            var result = await imageService.UploadProductImageAsync(id, stream, image.FileName);
            return Ok(ApiResponse<ProductImageUploadResponse>.Succeeded(result, "Tải lên ảnh thành công."));
        }
    }

    [HttpDelete("{id:guid}/image")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteImage(Guid id)
    {
        var imageService = HttpContext.RequestServices.GetRequiredService<IProductImageService>();
        await imageService.DeleteProductImageAsync(id);
        return Ok(ApiResponse<object>.Succeeded(null!, "Xóa ảnh sản phẩm thành công."));
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _service;
    public SuppliersController(ISupplierService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<SupplierDto>>>> GetAll()
        => Ok(ApiResponse<List<SupplierDto>>.Succeeded(await _service.GetAllAsync()));

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<SupplierDto>>> Create([FromBody] CreateSupplierRequest request)
        => Ok(ApiResponse<SupplierDto>.Succeeded(await _service.CreateAsync(request), "Tạo nhà cung cấp thành công."));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<SupplierDto>>> Update(Guid id, [FromBody] UpdateSupplierRequest request)
        => Ok(ApiResponse<SupplierDto>.Succeeded(await _service.UpdateAsync(id, request), "Cập nhật thành công."));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse<object>.Succeeded(null!, "Xóa nhà cung cấp thành công."));
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _service;
    public CustomersController(ICustomerService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<CustomerDto>>>> GetAll()
        => Ok(ApiResponse<List<CustomerDto>>.Succeeded(await _service.GetAllAsync()));

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> Create([FromBody] CreateCustomerRequest request)
        => Ok(ApiResponse<CustomerDto>.Succeeded(await _service.CreateAsync(request), "Tạo khách hàng thành công."));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> Update(Guid id, [FromBody] UpdateCustomerRequest request)
        => Ok(ApiResponse<CustomerDto>.Succeeded(await _service.UpdateAsync(id, request), "Cập nhật thành công."));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse<object>.Succeeded(null!, "Xóa khách hàng thành công."));
    }
}
