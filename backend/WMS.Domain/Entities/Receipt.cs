using WMS.Domain.Enums;

namespace WMS.Domain.Entities;

/// <summary>
/// Phiếu Nhập kho.
/// CreatedByUserId: FK trỏ về User (người tạo phiếu).
/// </summary>
public class Receipt
{
    public Guid Id { get; set; }
    public Guid WarehouseId { get; set; }

    public Guid? SupplierId { get; set; }

    /// <summary>FK trỏ về User – người tạo phiếu nhập.</summary>
    public Guid CreatedByUserId { get; set; }

    public ReceiptStatus Status { get; set; } = ReceiptStatus.Draft;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Warehouse? Warehouse { get; set; }
    public Supplier? Supplier { get; set; }
    public User? CreatedByUser { get; set; }
    public ICollection<ReceiptDetail> ReceiptDetails { get; set; } = new List<ReceiptDetail>();
}