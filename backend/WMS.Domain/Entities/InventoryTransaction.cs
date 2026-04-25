namespace WMS.Domain.Entities;
public class InventoryTransaction {
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid ZoneId { get; set; }
    public int QuantityChange { get; set; } // + cho Nhập, - cho Xuất
    public string TransactionType { get; set; } = string.Empty; // INBOUND, OUTBOUND, ADJUST
    public Guid? ReferenceId { get; set; } // ID của Receipt hoặc Issue tương ứng
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Product? Product { get; set; }
    public Zone? Zone { get; set; }
}