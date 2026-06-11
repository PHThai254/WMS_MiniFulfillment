namespace WMS.Domain.Entities;

public class Warehouse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;      // Max 200
    public string Location { get; set; } = string.Empty;

    // Navigation
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Zone> Zones { get; set; } = new List<Zone>();
    public ICollection<Inventory> Inventories { get; set; } = new List<Inventory>();
    public ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();
    public ICollection<Issue> Issues { get; set; } = new List<Issue>();
}