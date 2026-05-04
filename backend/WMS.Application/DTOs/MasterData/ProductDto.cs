namespace WMS.Application.DTOs.MasterData;

public record ProductDto(
    Guid Id,
    string SKU,
    string Barcode,
    string Name,
    Guid CategoryId,
    string CategoryName
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
