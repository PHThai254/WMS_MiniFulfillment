namespace WMS.Domain.Entities;

public class Product
{
    public Guid Id { get; set; }
    public Guid CategoryId { get; set; }
    public string SKU { get; set; } = string.Empty;       // Max 50, Unique
    public string Barcode { get; set; } = string.Empty;   // Max 50, Unique
    public string Name { get; set; } = string.Empty;      // Max 200
    public string? ImagePath { get; set; }
    public decimal Price { get; set; }                    // decimal(18,2) – configured in Fluent API

    // Navigation
    public Category? Category { get; set; }
    public ICollection<Inventory> Inventories { get; set; } = new List<Inventory>();
    public ICollection<ReceiptDetail> ReceiptDetails { get; set; } = new List<ReceiptDetail>();
    public ICollection<IssueDetail> IssueDetails { get; set; } = new List<IssueDetail>();
    public ICollection<InventoryTransaction> InventoryTransactions { get; set; } = new List<InventoryTransaction>();
}