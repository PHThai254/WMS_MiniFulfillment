using System.ComponentModel.DataAnnotations;

namespace WMS.Application.DTOs.MasterData;

public record ProductDto(
    Guid Id,
    string SKU,
    string Barcode,
    string Name,
    decimal Price, // Đã bổ sung trường Giá để xuất ra Frontend
    Guid CategoryId,
    string CategoryName,
    string? ImagePath = null
);

public record CreateProductRequest(
    [Required(ErrorMessage = "Tên sản phẩm không được để trống")]
    [MaxLength(200, ErrorMessage = "Tên sản phẩm không vượt quá 200 ký tự")]
    string Name,
    
    string? SKU,
    
    [Range(0, double.MaxValue, ErrorMessage = "Giá sản phẩm không hợp lệ")]
    decimal Price, // Bắt buộc phải có để nhận giá từ form nhập liệu
    
    [Required(ErrorMessage = "Vui lòng chọn Danh mục")]
    Guid CategoryId
);

public record UpdateProductRequest(
    [Required(ErrorMessage = "Tên sản phẩm không được để trống")]
    [MaxLength(200, ErrorMessage = "Tên sản phẩm không vượt quá 200 ký tự")]
    string Name,
    
    string? SKU,
    
    [Range(0, double.MaxValue, ErrorMessage = "Giá sản phẩm không hợp lệ")]
    decimal Price, // Bổ sung cho form cập nhật
    
    [Required(ErrorMessage = "Vui lòng chọn Danh mục")]
    Guid CategoryId
);

public record ProductImageUploadResponse(
    Guid ProductId,
    string ImagePath,
    string FileName,
    string Message
);