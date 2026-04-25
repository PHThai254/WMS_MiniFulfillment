namespace WMS.Domain.Entities;
public class Customer {
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? DeliveryAddress { get; set; }
}