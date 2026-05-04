namespace WMS.Application.DTOs.MasterData;

public record CustomerDto(
    Guid Id,
    string Name,
    string? Phone,
    string? DeliveryAddress
);

public record CreateCustomerRequest(
    string Name,
    string? Phone,
    string? DeliveryAddress
);

public record UpdateCustomerRequest(
    string Name,
    string? Phone,
    string? DeliveryAddress
);
