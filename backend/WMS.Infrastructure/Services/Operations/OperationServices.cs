using Microsoft.EntityFrameworkCore;
using WMS.Application.DTOs.Operations;
using WMS.Application.Interfaces;
using WMS.Domain.Entities;
using WMS.Domain.Enums;
using WMS.Infrastructure.Data;

namespace WMS.Infrastructure.Services.Operations;

public class ReceiptService : IReceiptService
{
    private readonly ApplicationDbContext _db;
    private readonly ICompletionCheckService _completionCheckService;
    private readonly IAiOcrService _aiOcrService;
    
    public ReceiptService(ApplicationDbContext db, ICompletionCheckService completionCheckService, IAiOcrService aiOcrService)
    {
        _db = db;
        _completionCheckService = completionCheckService;
        _aiOcrService = aiOcrService;
    }

    public async Task<List<ReceiptDto>> GetAllAsync() =>
        await _db.Receipts.AsNoTracking()
            .Include(r => r.Warehouse).Include(r => r.Supplier)
            .Include(r => r.ReceiptDetails).ThenInclude(d => d.Product)
            .Include(r => r.ReceiptDetails).ThenInclude(d => d.Zone)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => MapToDto(r)).ToListAsync();

    public async Task<ReceiptDto?> GetByIdAsync(Guid id)
    {
        var r = await _db.Receipts.AsNoTracking()
            .Include(r => r.Warehouse).Include(r => r.Supplier)
            .Include(r => r.ReceiptDetails).ThenInclude(d => d.Product)
            .Include(r => r.ReceiptDetails).ThenInclude(d => d.Zone)
            .FirstOrDefaultAsync(r => r.Id == id);
        return r is null ? null : MapToDto(r);
    }

    public async Task<ReceiptDto> CreateAsync(CreateReceiptRequest request, string createdBy)
    {
        if (!await _db.Warehouses.AnyAsync(w => w.Id == request.WarehouseId))
            throw new ArgumentException("Kho không tồn tại.");

        var receipt = new Receipt
        {
            Id = Guid.NewGuid(),
            WarehouseId = request.WarehouseId,
            SupplierId = request.SupplierId,
            CreatedByUserId = Guid.TryParse(createdBy, out var uid1) ? uid1 : Guid.Empty,
            Status = ReceiptStatus.Draft,
            CreatedAt = DateTime.UtcNow
        };

        foreach (var d in request.Details)
        {
            if (!await _db.Products.AnyAsync(p => p.Id == d.ProductId))
                throw new ArgumentException($"Sản phẩm {d.ProductId} không tồn tại.");
            receipt.ReceiptDetails.Add(new ReceiptDetail
            {
                Id = Guid.NewGuid(),
                ReceiptId = receipt.Id,
                ProductId = d.ProductId,
                ExpectedQuantity = d.ExpectedQuantity,
                ActualQuantity = 0,
                UnitPrice = d.UnitPrice
            });
        }

        _db.Receipts.Add(receipt);
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(receipt.Id))!;
    }

    public async Task<ReceiptDto> ApproveQcAsync(Guid id, ApproveReceiptRequest request)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var receipt = await _db.Receipts.Include(r => r.ReceiptDetails).FirstOrDefaultAsync(r => r.Id == id)
                ?? throw new KeyNotFoundException("Không tìm thấy phiếu nhập.");
            if (receipt.Status != ReceiptStatus.Draft)
                throw new InvalidOperationException("Chỉ có thể duyệt phiếu ở trạng thái Draft.");

            foreach (var upd in request.Details)
            {
                var detail = receipt.ReceiptDetails.FirstOrDefault(d => d.Id == upd.DetailId)
                    ?? throw new ArgumentException($"Không tìm thấy chi tiết {upd.DetailId}.");
                detail.ActualQuantity = upd.ActualQuantity;
                detail.ZoneId = upd.ZoneId;
            }
            receipt.Status = ReceiptStatus.QC_Checked;
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return (await GetByIdAsync(receipt.Id))!;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<ReceiptDto> ApproveOcrAsync(Guid id, ApproveOcrRequest request)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var receipt = await _db.Receipts.Include(r => r.ReceiptDetails).FirstOrDefaultAsync(r => r.Id == id)
                ?? throw new KeyNotFoundException("Không tìm thấy phiếu nhập.");

            if (receipt.Status != ReceiptStatus.Draft)
                throw new InvalidOperationException("Chỉ có thể duyệt phiếu ở trạng thái Draft.");

            // Update existing or add new details from OCR result
            foreach (var ocrItem in request.Details)
            {
                var existingDetail = receipt.ReceiptDetails.FirstOrDefault(d => d.ProductId == ocrItem.ProductId);
                if (existingDetail != null)
                {
                    existingDetail.ActualQuantity = ocrItem.ActualQuantity;
                    existingDetail.ZoneId = ocrItem.ZoneId;
                }
                else
                {
                    // Check if Product exists
                    if (!await _db.Products.AnyAsync(p => p.Id == ocrItem.ProductId))
                        throw new ArgumentException($"Sản phẩm {ocrItem.ProductId} không tồn tại.");

                    receipt.ReceiptDetails.Add(new ReceiptDetail
                    {
                        Id = Guid.NewGuid(),
                        ReceiptId = receipt.Id,
                        ProductId = ocrItem.ProductId,
                        ExpectedQuantity = 0,
                        ActualQuantity = ocrItem.ActualQuantity,
                        ZoneId = ocrItem.ZoneId
                    });
                }
            }

            receipt.Status = ReceiptStatus.QC_Checked;
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return (await GetByIdAsync(receipt.Id))!;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<ReceiptDto> CompletePutAwayAsync(Guid id)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var receipt = await _db.Receipts.Include(r => r.ReceiptDetails).FirstOrDefaultAsync(r => r.Id == id)
                ?? throw new KeyNotFoundException("Không tìm thấy phiếu nhập.");
            if (receipt.Status != ReceiptStatus.QC_Checked)
                throw new InvalidOperationException("Chỉ có thể hoàn thành từ phiếu đã duyệt QC.");

            foreach (var d in receipt.ReceiptDetails.Where(d => d.ZoneId.HasValue && d.ActualQuantity > 0))
            {
                var inv = await _db.Inventories.FirstOrDefaultAsync(i =>
                    i.ProductId == d.ProductId && i.ZoneId == d.ZoneId!.Value && i.WarehouseId == receipt.WarehouseId);

                if (inv is null)
                {
                    _db.Inventories.Add(new Inventory
                    {
                        Id = Guid.NewGuid(),
                        WarehouseId = receipt.WarehouseId,
                        ZoneId = d.ZoneId!.Value,
                        ProductId = d.ProductId,
                        Quantity = d.ActualQuantity,
                        LastRestockedDate = DateTime.UtcNow
                    });
                }
                else
                {
                    inv.Quantity += d.ActualQuantity;
                    inv.LastRestockedDate = DateTime.UtcNow;
                }

                _db.InventoryTransactions.Add(new InventoryTransaction
                {
                    Id = Guid.NewGuid(),
                    ProductId = d.ProductId,
                    ZoneId = d.ZoneId!.Value,
                    QuantityChange = d.ActualQuantity,
                    TransactionType = TransactionType.Inbound,
                    ReferenceId = receipt.Id,
                    CreatedAt = DateTime.UtcNow
                });
            }
            receipt.Status = ReceiptStatus.Completed;
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            
            return (await GetByIdAsync(receipt.Id))!;
        }
        catch { await tx.RollbackAsync(); throw; }
    }

    public async Task<OcrResultDto> RunOcrAsync(Stream imageStream, string fileName)
    {
        using var ms = new MemoryStream();
        await imageStream.CopyToAsync(ms);
        var base64Image = Convert.ToBase64String(ms.ToArray());

        var extension = System.IO.Path.GetExtension(fileName)?.ToLowerInvariant();
        var mimeType = extension == ".png" ? "image/png" : extension == ".webp" ? "image/webp" : extension == ".heic" ? "image/heic" : "image/jpeg";
        var jsonResult = await _aiOcrService.ExtractInvoiceDataAsync(base64Image, mimeType);

        var items = new List<OcrLineItemDto>();
        bool hasLowConfidence = false;

        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(jsonResult);
            var root = doc.RootElement;
            
            if (root.TryGetProperty("items", out var itemsElement) && itemsElement.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                foreach (var itemElement in itemsElement.EnumerateArray())
                {
                    string name = itemElement.TryGetProperty("productName", out var n) ? n.GetString() ?? "Unknown" : "Unknown";
                    int qty = itemElement.TryGetProperty("quantity", out var q) ? (q.TryGetInt32(out int qVal) ? qVal : 0) : 0;
                    decimal price = itemElement.TryGetProperty("unitPrice", out var p) ? (p.TryGetDecimal(out decimal pVal) ? pVal : 0m) : 0m;
                    
                    bool isSuspicious = false;
                    if (itemElement.TryGetProperty("productNameConfidence", out var nc) && nc.GetDouble() < 0.7) isSuspicious = true;
                    if (itemElement.TryGetProperty("quantityConfidence", out var qc) && qc.GetDouble() < 0.7) isSuspicious = true;
                    if (itemElement.TryGetProperty("unitPriceConfidence", out var pc) && pc.GetDouble() < 0.7) isSuspicious = true;
                    
                    if (isSuspicious) hasLowConfidence = true;

                    items.Add(new OcrLineItemDto(name, qty, price, isSuspicious));
                }
            }
            if (root.TryGetProperty("suspiciousFields", out var suspicious) && suspicious.GetArrayLength() > 0)
            {
                hasLowConfidence = true;
            }
        }
        catch
        {
            hasLowConfidence = true;
        }

        return new OcrResultDto(jsonResult, items, hasLowConfidence);
    }

    /// <summary>
    /// Lưu Receipt từ dữ liệu OCR đã được QA/QC duyệt
    /// Tạo phiếu nhập mới với các chi tiết được cấp phát vào Zone cụ thể
    /// </summary>
    public async Task<Guid> SaveReceiptFromOcrAsync(SaveOcrReceiptRequest request, string createdBy)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            // Kiểm tra Supplier
            if (!await _db.Suppliers.AnyAsync(s => s.Id == request.SupplierId))
                throw new ArgumentException("Nhà cung cấp không tồn tại.");

            if (request.Items == null || !request.Items.Any())
                throw new ArgumentException("Danh sách sản phẩm không được trống.");

            // Kiểm tra tất cả Products và Zones tồn tại
            foreach (var item in request.Items)
            {
                if (!await _db.Products.AnyAsync(p => p.Id == item.ProductId))
                    throw new ArgumentException($"Sản phẩm {item.ProductId} không tồn tại.");

                if (!await _db.Zones.AnyAsync(z => z.Id == item.ZoneId))
                    throw new ArgumentException($"Zone {item.ZoneId} không tồn tại.");
            }

            // Lấy WarehouseId từ User Context (được set qua JWT Token)
            // Giả sử WarehouseId được lấy từ request hoặc context - ở đây tạm lấy từ Zone
            var zone = await _db.Zones.FirstAsync(z => z.Id == request.Items.First().ZoneId);
            var warehouseId = zone.WarehouseId;

            // Tạo phiếu nhập mới
            var receipt = new Receipt
            {
                Id = Guid.NewGuid(),
                WarehouseId = warehouseId,
                SupplierId = request.SupplierId,
                CreatedByUserId = Guid.TryParse(createdBy, out var uid2) ? uid2 : Guid.Empty,
                Status = ReceiptStatus.QC_Checked, // Trực tiếp set thành QC_Checked vì đã duyệt
                CreatedAt = DateTime.UtcNow
            };

            // Thêm chi tiết từ OCR - mapping chuẩn Expected vs Actual
            foreach (var item in request.Items)
            {
                receipt.ReceiptDetails.Add(new ReceiptDetail
                {
                    Id = Guid.NewGuid(),
                    ReceiptId = receipt.Id,
                    ProductId = item.ProductId,
                    ZoneId = item.ZoneId,
                    ExpectedQuantity = item.ExpectedQuantity, // Số AI đọc được
                    ActualQuantity = item.ActualQuantity,     // Số QA/QC chốt thực tế
                    UnitPrice = item.UnitPrice
                });
            }

            _db.Receipts.Add(receipt);
            await _db.SaveChangesAsync();

            // Cập nhật tồn kho ngay lập tức (vì đã duyệt)
            foreach (var item in request.Items)
            {
                var inventory = await _db.Inventories.FirstOrDefaultAsync(i =>
                    i.WarehouseId == warehouseId &&
                    i.ZoneId == item.ZoneId &&
                    i.ProductId == item.ProductId);

                if (inventory == null)
                {
                    _db.Inventories.Add(new Inventory
                    {
                        Id = Guid.NewGuid(),
                        WarehouseId = warehouseId,
                        ZoneId = item.ZoneId,
                        ProductId = item.ProductId,
                        Quantity = item.ActualQuantity, // Dùng ActualQuantity (QA/QC chốt)
                        LastRestockedDate = DateTime.UtcNow
                    });
                }
                else
                {
                    inventory.Quantity += item.ActualQuantity; // Cộng theo số thực tế
                    inventory.LastRestockedDate = DateTime.UtcNow;
                }

                // Ghi log giao dịch (dùng ActualQuantity - số QA/QC đã chốt)
                _db.InventoryTransactions.Add(new InventoryTransaction
                {
                    Id = Guid.NewGuid(),
                    ProductId = item.ProductId,
                    ZoneId = item.ZoneId,
                    QuantityChange = item.ActualQuantity, // Cập nhật tồn kho theo số thực tế
                    TransactionType = TransactionType.Inbound,
                    ReferenceId = receipt.Id,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Update Receipt status thành Completed
            receipt.Status = ReceiptStatus.Completed;
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return receipt.Id; // Return receipt identifier
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    private static ReceiptDto MapToDto(Receipt r) => new(
        r.Id, r.WarehouseId, r.Warehouse?.Name ?? string.Empty,
        r.SupplierId, r.Supplier?.Name, r.CreatedByUserId, r.CreatedByUser?.Username, r.Status, r.CreatedAt,
        r.ReceiptDetails.Select(d => new ReceiptDetailDto(
            d.Id, d.ReceiptId, d.ProductId,
            d.Product?.Name ?? string.Empty, d.Product?.Barcode ?? string.Empty,
            d.ZoneId, d.Zone?.Name, d.ExpectedQuantity, d.ActualQuantity, d.UnitPrice)).ToList()
    );
}

public class IssueService : IIssueService
{
    private readonly ApplicationDbContext _db;
    private readonly ICompletionCheckService _completionCheckService;
    
    public IssueService(ApplicationDbContext db, ICompletionCheckService completionCheckService)
    {
        _db = db;
        _completionCheckService = completionCheckService;
    }

    public async Task<List<IssueDto>> GetAllAsync() =>
        await _db.Issues.AsNoTracking()
            .Include(i => i.Warehouse).Include(i => i.Customer)
            .Include(i => i.IssueDetails).ThenInclude(d => d.Product)
            .Include(i => i.IssueDetails).ThenInclude(d => d.Zone)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => MapToDto(i)).ToListAsync();

    public async Task<IssueDto?> GetByIdAsync(Guid id)
    {
        var i = await _db.Issues.AsNoTracking()
            .Include(i => i.Warehouse).Include(i => i.Customer)
            .Include(i => i.IssueDetails).ThenInclude(d => d.Product)
            .Include(i => i.IssueDetails).ThenInclude(d => d.Zone)
            .FirstOrDefaultAsync(x => x.Id == id);
        return i is null ? null : MapToDto(i);
    }

    public async Task<IssueDto> CreateAsync(CreateIssueRequest request, string createdBy)
    {
        if (!await _db.Warehouses.AnyAsync(w => w.Id == request.WarehouseId))
            throw new ArgumentException("Kho không tồn tại.");

        var issue = new Issue
        {
            Id = Guid.NewGuid(),
            WarehouseId = request.WarehouseId,
            CustomerId = request.CustomerId,
            CreatedByUserId = Guid.TryParse(createdBy, out var uid3) ? uid3 : Guid.Empty,
            Status = IssueStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        foreach (var d in request.Details)
        {
            issue.IssueDetails.Add(new IssueDetail
            {
                Id = Guid.NewGuid(),
                IssueId = issue.Id,
                ProductId = d.ProductId,
                QuantityToPick = d.QuantityToPick,
                PickedQuantity = 0
            });
        }
        _db.Issues.Add(issue);
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(issue.Id))!;
    }

    /// <summary>
    /// FIFO Split Allocation Algorithm - theo copilot-instructions Section 13
    /// </summary>
    public async Task<PickingPlanDto> GeneratePickingPlanAsync(Guid issueId)
    {
        var issue = await _db.Issues.Include(i => i.IssueDetails).ThenInclude(d => d.Product)
            .FirstOrDefaultAsync(i => i.Id == issueId)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu xuất.");

        var planItems = new List<PickingPlanItemDto>();

        foreach (var detail in issue.IssueDetails)
        {
            var remaining = detail.QuantityToPick - detail.PickedQuantity;
            if (remaining <= 0) continue;

            // FIFO: hàng nhập cũ nhất (LastRestockedDate ASC) lấy trước
            var inventories = await _db.Inventories.Include(i => i.Zone)
                .Where(i => i.ProductId == detail.ProductId && i.Quantity > 0)
                .OrderBy(i => i.LastRestockedDate)
                .ToListAsync();

            foreach (var inv in inventories)
            {
                if (remaining <= 0) break;
                var qty = Math.Min(inv.Quantity, remaining);
                planItems.Add(new PickingPlanItemDto(
                    detail.Id, detail.ProductId, detail.Product?.Name ?? string.Empty,
                    detail.Product?.Barcode ?? string.Empty, inv.ZoneId,
                    inv.Zone?.Name ?? string.Empty, qty, inv.LastRestockedDate));
                remaining -= qty;
            }
        }

        if (issue.Status == IssueStatus.Pending)
        {
            var issueEntity = await _db.Issues.FindAsync(issueId);
            if (issueEntity != null) { issueEntity.Status = IssueStatus.Picking; await _db.SaveChangesAsync(); }
        }

        return new PickingPlanDto(issueId, planItems);
    }

    public async Task<IssueDto> ConfirmPickAsync(Guid issueId, ConfirmPickRequest request)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var issue = await _db.Issues.Include(i => i.IssueDetails).FirstOrDefaultAsync(i => i.Id == issueId)
                ?? throw new KeyNotFoundException("Không tìm thấy phiếu xuất.");
            var detail = issue.IssueDetails.FirstOrDefault(d => d.Id == request.IssueDetailId)
                ?? throw new ArgumentException("Không tìm thấy chi tiết phiếu.");

            var inv = await _db.Inventories.FirstOrDefaultAsync(i =>
                i.ProductId == detail.ProductId && i.ZoneId == detail.ZoneId && i.WarehouseId == issue.WarehouseId)
                ?? throw new InvalidOperationException("Không tìm thấy tồn kho.");

            if (inv.Quantity < request.PickedQuantity)
                throw new InvalidOperationException($"Tồn kho không đủ. Hiện còn: {inv.Quantity}");

            inv.Quantity -= request.PickedQuantity;
            detail.PickedQuantity += request.PickedQuantity;

            _db.InventoryTransactions.Add(new InventoryTransaction
            {
                Id = Guid.NewGuid(),
                ProductId = detail.ProductId,
                ZoneId = detail.ZoneId ?? Guid.Empty,
                QuantityChange = -request.PickedQuantity,
                TransactionType = TransactionType.Outbound,
                ReferenceId = issue.Id,
                CreatedAt = DateTime.UtcNow
            });

            if (issue.IssueDetails.All(d => d.PickedQuantity >= d.QuantityToPick))
                issue.Status = IssueStatus.Handover;

            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            
            // Tự động kiểm tra và chuyển sang Handover nếu hết hàng
            await _completionCheckService.CheckAndCompleteIssueAsync(issue.Id);
            
            return (await GetByIdAsync(issue.Id))!;
        }
        catch { await tx.RollbackAsync(); throw; }
    }

    /// <summary>
    /// Xác nhận toàn bộ số lượng thực lấy cho 1 phiếu xuất (batch confirm).
    /// ─────────────────────────────────────────────────────────────────────
    /// LUỒNG XỬ LÝ:
    ///   1. Validate: phiếu tồn tại, đang ở trạng thái Picking.
    ///   2. Validate input: ActualQuantity > 0, không trùng ProductId.
    ///   3. Mở IDbContextTransaction (ACID).
    ///   4. Với mỗi PickedItem:
    ///      a. Tìm IssueDetail khớp ProductId.
    ///      b. Tìm Inventory theo ProductId + WarehouseId (FIFO: cũ nhất trước).
    ///      c. Nếu tồn kho < ActualQuantity → Rollback + throw 400.
    ///      d. Trừ Inventory.Quantity theo FIFO, tăng IssueDetail.PickedQuantity.
    ///      e. Ghi InventoryTransaction (Outbound, QuantityChange âm).
    ///   5. Nếu tất cả IssueDetail đã pick đủ → Issue.Status = Picked.
    ///   6. Commit transaction.
    /// ─────────────────────────────────────────────────────────────────────
    /// CONCURRENCY: Inventory.RowVersion là Concurrency Token → EF Core tự
    /// throw DbUpdateConcurrencyException nếu 2 request cùng trừ kho 1 lúc.
    /// Controller bắt exception này và trả về 409 Conflict.
    /// </summary>
    public async Task<IssueDto> ConfirmPickingBatchAsync(ConfirmPickingRequestDto request)
    {
        // ── 1. Validate: phiếu tồn tại ──────────────────────────────────────
        var issue = await _db.Issues
            .Include(i => i.IssueDetails)
            .FirstOrDefaultAsync(i => i.Id == request.IssueId)
            ?? throw new KeyNotFoundException($"Không tìm thấy phiếu xuất với Id = {request.IssueId}.");

        // Chỉ cho phép confirm khi phiếu đang ở trạng thái Picking
        if (issue.Status != IssueStatus.Picking)
            throw new InvalidOperationException(
                $"Phiếu xuất đang ở trạng thái '{issue.Status}'. Chỉ có thể xác nhận nhặt hàng khi phiếu ở trạng thái 'Picking'.");

        // ── 2. Validate input ─────────────────────────────────────────────────
        if (request.PickedItems == null || request.PickedItems.Count == 0)
            throw new ArgumentException("Danh sách PickedItems không được để trống.");

        // Không cho phép ActualQuantity <= 0
        var invalidItems = request.PickedItems.Where(p => p.ActualQuantity <= 0).ToList();
        if (invalidItems.Any())
            throw new ArgumentException(
                $"ActualQuantity phải lớn hơn 0. Các ProductId vi phạm: {string.Join(", ", invalidItems.Select(i => i.ProductId))}");

        // Không cho phép trùng ProductId trong cùng 1 request
        var duplicateProductIds = request.PickedItems
            .GroupBy(p => p.ProductId)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();
        if (duplicateProductIds.Any())
            throw new ArgumentException(
                $"Danh sách PickedItems có ProductId bị trùng lặp: {string.Join(", ", duplicateProductIds)}");

        // ── 3. Mở Transaction (ACID) ──────────────────────────────────────────
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            foreach (var pickedItem in request.PickedItems)
            {
                // ── 4a. Tìm IssueDetail khớp ProductId ───────────────────────
                var detail = issue.IssueDetails.FirstOrDefault(d => d.ProductId == pickedItem.ProductId)
                    ?? throw new ArgumentException(
                        $"Sản phẩm {pickedItem.ProductId} không có trong phiếu xuất này.");

                // ── 4b. Tìm Inventory theo FIFO (cũ nhất trước) ──────────────
                var inventorySlots = await _db.Inventories
                    .Where(i => i.ProductId == pickedItem.ProductId
                             && i.WarehouseId == issue.WarehouseId
                             && i.Quantity > 0)
                    .OrderBy(i => i.LastRestockedDate)   // FIFO: hàng nhập cũ nhất lấy trước
                    .ToListAsync();

                int totalAvailable = inventorySlots.Sum(i => i.Quantity);

                // ── 4c. Kiểm tra đủ hàng – TUYỆT ĐỐI không để âm kho ────────
                if (totalAvailable < pickedItem.ActualQuantity)
                {
                    await tx.RollbackAsync();
                    throw new InvalidOperationException(
                        $"Tồn kho không đủ cho sản phẩm {pickedItem.ProductId}. " +
                        $"Cần: {pickedItem.ActualQuantity}, Hiện còn: {totalAvailable}. " +
                        $"Giao dịch đã bị hủy bỏ toàn bộ.");
                }

                // ── 4d. Trừ kho theo FIFO (trừ hết slot cũ trước, rồi sang slot tiếp theo) ──
                int remaining = pickedItem.ActualQuantity;
                foreach (var slot in inventorySlots)
                {
                    if (remaining <= 0) break;

                    int deduct = Math.Min(slot.Quantity, remaining);
                    slot.Quantity -= deduct;
                    remaining -= deduct;

                    // ── 4e. Ghi InventoryTransaction cho từng slot bị trừ ─────
                    _db.InventoryTransactions.Add(new InventoryTransaction
                    {
                        Id = Guid.NewGuid(),
                        ProductId = pickedItem.ProductId,
                        ZoneId = slot.ZoneId,
                        QuantityChange = -deduct,                    // Âm = xuất kho
                        TransactionType = TransactionType.Outbound,
                        ReferenceId = issue.Id,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // Cập nhật số lượng đã lấy thực tế trên dòng phiếu
                detail.PickedQuantity += pickedItem.ActualQuantity;
            }

            // ── 5. Kiểm tra toàn bộ phiếu đã pick đủ chưa ───────────────────
            bool allPicked = issue.IssueDetails.All(d => d.PickedQuantity >= d.QuantityToPick);
            if (allPicked)
                issue.Status = IssueStatus.Picked;   // "Đã nhặt hàng" - chờ bàn giao

            issue.UpdatedAt = DateTime.UtcNow;

            // ── 6. Commit ─────────────────────────────────────────────────────
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return (await GetByIdAsync(issue.Id))!;
        }
        catch (InvalidOperationException)
        {
            // Lỗi nghiệp vụ (âm kho): đã Rollback bên trong, ném lại để Controller xử lý
            throw;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<IssueDto> HandoverAsync(Guid issueId)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var issue = await _db.Issues.FirstOrDefaultAsync(i => i.Id == issueId)
                ?? throw new KeyNotFoundException("Không tìm thấy phiếu xuất.");
            issue.Status = IssueStatus.Handover;
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return (await GetByIdAsync(issue.Id))!;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    private static IssueDto MapToDto(Issue i) => new(
        i.Id, i.WarehouseId, i.Warehouse?.Name ?? string.Empty,
        i.CustomerId, i.Customer?.Name, i.CreatedByUserId, i.CreatedByUser?.Username, i.Status, i.CreatedAt,
        i.IssueDetails.Select(d => new IssueDetailDto(
            d.Id, d.IssueId, d.ProductId, d.Product?.Name ?? string.Empty, d.Product?.Barcode ?? string.Empty,
            d.ZoneId, d.Zone?.Name, d.QuantityToPick, d.PickedQuantity)).ToList()
    );
}
