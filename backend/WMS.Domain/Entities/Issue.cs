using WMS.Domain.Enums;

namespace WMS.Domain.Entities;

/// <summary>
/// Phiếu Xuất kho.
/// CreatedByUserId: FK trỏ về User (người tạo phiếu).
/// </summary>
public class Issue
{
    public Guid Id { get; set; }
    public Guid WarehouseId { get; set; }

    public Guid? CustomerId { get; set; }

    /// <summary>FK trỏ về User – người tạo phiếu xuất.</summary>
    public Guid CreatedByUserId { get; set; }

    public IssueStatus Status { get; set; } = IssueStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Warehouse? Warehouse { get; set; }
    public Customer? Customer { get; set; }
    public User? CreatedByUser { get; set; }
    public ICollection<IssueDetail> IssueDetails { get; set; } = new List<IssueDetail>();
}