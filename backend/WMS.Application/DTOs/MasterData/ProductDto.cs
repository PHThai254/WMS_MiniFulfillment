namespace WMS.Application.DTOs.MasterData;

public record ProductDto(
    Guid Id,
    string SKU,
    string Barcode,
    string Name,
    Guid CategoryId,
    string CategoryName,
    string? ImagePath = null
);

public record CreateProductRequest(
    string Name,
    string SKU,
    Guid CategoryId
);

public record UpdateProductRequest(
    string Name,
    string SKU,
    Guid CategoryId
);

public record ProductImageUploadResponse(
    Guid ProductId,
    string ImagePath,
    string FileName,
    string Message
);
