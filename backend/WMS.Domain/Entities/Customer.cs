namespace WMS.Domain.Entities;

/// <summary>
/// Customer là Leaf Node – KHÔNG có FK nối về User hay Warehouse.
/// </summary>
public class Customer
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;   // Max 200
    public string? Phone { get; set; }
    public string? DeliveryAddress { get; set; }

    // Navigation
    public ICollection<Issue> Issues { get; set; } = new List<Issue>();
}