namespace WMS.Domain.Entities;

public class Zone
{
    public Guid Id { get; set; }
    public Guid WarehouseId { get; set; }
    public string Name { get; set; } = string.Empty;  // Max 100

    // Navigation
    public Warehouse? Warehouse { get; set; }
    public ICollection<Inventory> Inventories { get; set; } = new List<Inventory>();
    public ICollection<InventoryTransaction> InventoryTransactions { get; set; } = new List<InventoryTransaction>();
}