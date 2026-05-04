namespace WMS.Application.DTOs.MasterData;

public record CategoryDto(
    Guid Id,
    string Name,
    int ProductCount = 0
);

public record CreateCategoryRequest(string Name);
public record UpdateCategoryRequest(string Name);
