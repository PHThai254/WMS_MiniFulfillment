using WMS.Domain.Enums;

namespace WMS.Domain.Entities;

/// <summary>
/// Giao dịch tồn kho: Nhập (Inbound), Xuất (Outbound), Điều chỉnh (Adjust).
/// ReferenceId: ID của Receipt hoặc Issue tương ứng.
/// </summary>
public class InventoryTransaction
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid ZoneId { get; set; }

    /// <summary>+ cho Nhập, - cho Xuất</summary>
    public int QuantityChange { get; set; }

    public TransactionType TransactionType { get; set; }

    /// <summary>ID của Receipt hoặc Issue tương ứng</summary>
    public Guid? ReferenceId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Product? Product { get; set; }
    public Zone? Zone { get; set; }
}