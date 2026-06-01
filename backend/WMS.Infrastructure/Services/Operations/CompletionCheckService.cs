using Microsoft.EntityFrameworkCore;
using WMS.Application.Interfaces;
using WMS.Domain.Enums;
using WMS.Infrastructure.Data;

namespace WMS.Infrastructure.Services.Operations;

/// <summary>
/// Service kiểm tra và tự động chuyển trạng thái hóa đơn sang Completed.
/// 
/// Quy tắc:
/// - Receipt: Chuyển Completed khi TẤT CẢ ReceiptDetail có:
///   + ActualQuantity > 0 (đã nhập hàng thực tế)
///   + Có ReceiptDetail được ghi vào Inventory (kiểm tra InventoryTransaction với ReferenceId = Receipt.Id)
/// - Issue: Chuyển Handover khi TẤT CẢ IssueDetail có:
///   + PickedQuantity = QuantityToPick (đã pick đủ hàng)
/// </summary>
public class CompletionCheckService : ICompletionCheckService
{
    private readonly ApplicationDbContext _db;

    public CompletionCheckService(ApplicationDbContext db) => _db = db;

    /// <summary>
    /// Kiểm tra Receipt: Nếu TẤT CẢ ReceiptDetail có ActualQuantity > 0
    /// và đã được ghi vào InventoryTransaction, thì chuyển sang Completed.
    /// </summary>
    public async Task<bool> CheckAndCompleteReceiptAsync(Guid receiptId)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var receipt = await _db.Receipts
                .Include(r => r.ReceiptDetails)
                .FirstOrDefaultAsync(r => r.Id == receiptId)
                ?? throw new KeyNotFoundException($"Không tìm thấy phiếu nhập {receiptId}.");

            // Chỉ kiểm tra khi Receipt ở trạng thái QC_Checked
            if (receipt.Status != ReceiptStatus.QC_Checked)
                return false;

            // Lọc những chi tiết có ActualQuantity > 0 (những hàng thực tế đã nhập)
            var validDetails = receipt.ReceiptDetails
                .Where(d => d.ActualQuantity > 0)
                .ToList();

            // Nếu không có chi tiết nào với ActualQuantity > 0, không hoàn thành
            if (!validDetails.Any())
                return false;

            // Kiểm tra TẤT CẢ valid details đã được ghi vào InventoryTransaction
            // (tức là đã được cất hàng thành công)
            foreach (var detail in validDetails)
            {
                var transactionExists = await _db.InventoryTransactions
                    .AnyAsync(it =>
                        it.ReferenceId == receipt.Id &&
                        it.ProductId == detail.ProductId &&
                        it.ZoneId == detail.ZoneId &&
                        it.TransactionType == "INBOUND" &&
                        it.QuantityChange == detail.ActualQuantity
                    );

                // Nếu có bất kỳ detail nào CHƯA được ghi vào InventoryTransaction, dừng kiểm tra
                if (!transactionExists)
                    return false;
            }

            // Tất cả details đều đã được cất hàng -> Chuyển sang Completed
            receipt.Status = ReceiptStatus.Completed;
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return true;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Kiểm tra Issue: Nếu TẤT CẢ IssueDetail có PickedQuantity = QuantityToPick,
    /// thì chuyển sang Handover (Bàn giao).
    /// </summary>
    public async Task<bool> CheckAndCompleteIssueAsync(Guid issueId)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var issue = await _db.Issues
                .Include(i => i.IssueDetails)
                .FirstOrDefaultAsync(i => i.Id == issueId)
                ?? throw new KeyNotFoundException($"Không tìm thấy phiếu xuất {issueId}.");

            // Chỉ kiểm tra khi Issue ở trạng thái Picking
            if (issue.Status != IssueStatus.Picking)
                return false;

            // Nếu không có IssueDetail nào, không hoàn thành
            if (!issue.IssueDetails.Any())
                return false;

            // Kiểm tra TẤT CẢ IssueDetail đã pick đủ hàng
            var allPickedComplete = issue.IssueDetails.All(d => d.PickedQuantity == d.QuantityToPick);

            if (!allPickedComplete)
                return false;

            // Tất cả hàng đã pick đủ -> Chuyển sang Handover
            issue.Status = IssueStatus.Handover;
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return true;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}
