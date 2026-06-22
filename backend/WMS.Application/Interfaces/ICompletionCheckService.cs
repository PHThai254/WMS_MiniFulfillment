namespace WMS.Application.Interfaces;

/// <summary>
/// Service kiểm tra và tự động chuyển trạng thái hóa đơn sang Completed
/// khi đủ hàng (tất cả chi tiết đã được xử lý)
/// </summary>
public interface ICompletionCheckService
{
    /// <summary>
    /// Kiểm tra Receipt và chuyển sang Completed nếu tất cả ReceiptDetail 
    /// đã được cất hàng thành công vào Inventory
    /// </summary>
    Task<bool> CheckAndCompleteReceiptAsync(Guid receiptId);

    /// <summary>
    /// Kiểm tra Issue và chuyển sang Handover nếu tất cả IssueDetail 
    /// đã được pick/nhặt đủ hàng
    /// </summary>
    Task<bool> CheckAndCompleteIssueAsync(Guid issueId);
}
