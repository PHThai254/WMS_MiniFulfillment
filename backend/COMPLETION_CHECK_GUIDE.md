# Completion Check Trigger - Hướng Dẫn Sử Dụng

## 📋 Tổng Quan

Hệ thống có thể **tự động chuyển hóa đơn (Receipt/Issue) sang Completed** khi đủ hàng:
- **Receipt (Phiếu Nhập):** Chuyển sang `Completed` khi TẤT CẢ ReceiptDetail đã được cất vào Inventory
- **Issue (Phiếu Xuất):** Chuyển sang `Handover` khi TẤT CẢ IssueDetail đã pick đủ hàng

---

## 🔧 Cơ Chế Hoạt Động

### 1. **Luồng Receipt (Phiếu Nhập)**

#### Trạng thái chuyển đổi:
```
Draft → QC_Checked → Completed (Auto)
```

#### Điều kiện tự động chuyển Completed:
- Status hiện tại: `QC_Checked`
- TẤT CẢ ReceiptDetail có:
  - `ActualQuantity > 0` (đã nhập hàng thực tế)
  - Được ghi vào `InventoryTransaction` với:
    - `TransactionType = "INBOUND"`
    - `ReferenceId = Receipt.Id`
    - `QuantityChange = ReceiptDetail.ActualQuantity`

#### Trigger Points (Các điểm kích hoạt kiểm tra):
1. **`CompletePutAwayAsync()`** - Khi thủ kho cất hàng xong
2. **`SaveReceiptFromOcrAsync()`** - Khi QA/QC duyệt OCR

#### Ví dụ Flow:
```csharp
// 1. QA/QC duyệt phiếu nhập thành QC_Checked
POST /api/receipts/{receiptId}/approve-qc

// 2. Thủ kho quét hàng và cất vào Zone
// Mỗi quét gọi API:
POST /api/issues/{issueId}/confirm-pick
  Body: { issueDetailId: "...", pickedQuantity: 5 }

// 3. Khi tất cả hàng cất xong, gọi:
POST /api/receipts/{receiptId}/complete-put-away
// System tự động kiểm tra nếu đủ hàng → chuyển Completed

// Result: Receipt.Status = Completed ✅
```

---

### 2. **Luồng Issue (Phiếu Xuất)**

#### Trạng thái chuyển đổi:
```
Pending → Picking → Handover (Auto)
```

#### Điều kiện tự động chuyển Handover:
- Status hiện tại: `Picking`
- TẤT CẢ IssueDetail có:
  - `PickedQuantity = QuantityToPick` (đã pick đủ hàng)

#### Trigger Points (Các điểm kích hoạt kiểm tra):
1. **`ConfirmPickAsync()`** - Khi thủ kho xác nhận pick một chi tiết

#### Ví dụ Flow:
```csharp
// 1. Tạo phiếu xuất
POST /api/issues
  Body: { 
    warehouseId: "warehouse-123",
    customerId: "customer-456",
    details: [
      { productId: "prod-1", quantityToPick: 10 },
      { productId: "prod-2", quantityToPick: 5 }
    ]
  }
// Result: Issue.Status = Pending

// 2. Lấy picking plan (FIFO)
GET /api/issues/{issueId}/picking-plan
// Result: Danh sách vị trí cần lấy hàng theo thứ tự FIFO
// Status auto chuyển sang: Picking

// 3. Quét hàng và xác nhận pick từng chi tiết
POST /api/issues/{issueId}/confirm-pick
  Body: { 
    issueDetailId: "detail-1",
    pickedQuantity: 10
  }
// System kiểm tra nếu:
//   - IssueDetail.PickedQuantity = QuantityToPick ✓
//   - TẤT CẢ IssueDetail đã pick đủ ✓
// → Chuyển Issue.Status = Handover ✅

// 4. Xác nhận bàn giao (lấy từ trạng thái Handover)
POST /api/issues/{issueId}/handover
// Result: Issue.Status = Handover (Confirmed)
```

---

## 💾 Cấu Trúc Kiểm Tra Logic

### Receipt Completion Check
```csharp
// Gọi từ: CompletePutAwayAsync()
await _completionCheckService.CheckAndCompleteReceiptAsync(receiptId);
```

**Pseudo Code:**
```csharp
public async Task<bool> CheckAndCompleteReceiptAsync(Guid receiptId)
{
    var receipt = await _db.Receipts
        .Include(r => r.ReceiptDetails)
        .FirstOrDefaultAsync(r => r.Id == receiptId);
    
    // 1. Kiểm tra Status = QC_Checked
    if (receipt.Status != ReceiptStatus.QC_Checked)
        return false;
    
    // 2. Lọc các detail có ActualQuantity > 0
    var validDetails = receipt.ReceiptDetails
        .Where(d => d.ActualQuantity > 0)
        .ToList();
    
    if (!validDetails.Any())
        return false;
    
    // 3. Kiểm tra TẤT CẢ valid detail được ghi vào InventoryTransaction
    foreach (var detail in validDetails)
    {
        var transactionExists = await _db.InventoryTransactions
            .AnyAsync(it =>
                it.ReferenceId == receiptId &&
                it.ProductId == detail.ProductId &&
                it.ZoneId == detail.ZoneId &&
                it.TransactionType == "INBOUND" &&
                it.QuantityChange == detail.ActualQuantity
            );
        
        if (!transactionExists)
            return false; // Chưa cất xong, dừng kiểm tra
    }
    
    // 4. Tất cả đều OK → Chuyển Completed
    receipt.Status = ReceiptStatus.Completed;
    await _db.SaveChangesAsync();
    return true;
}
```

### Issue Completion Check
```csharp
// Gọi từ: ConfirmPickAsync()
await _completionCheckService.CheckAndCompleteIssueAsync(issueId);
```

**Pseudo Code:**
```csharp
public async Task<bool> CheckAndCompleteIssueAsync(Guid issueId)
{
    var issue = await _db.Issues
        .Include(i => i.IssueDetails)
        .FirstOrDefaultAsync(i => i.Id == issueId);
    
    // 1. Kiểm tra Status = Picking
    if (issue.Status != IssueStatus.Picking)
        return false;
    
    // 2. Kiểm tra TẤT CẢ IssueDetail
    var allPickedComplete = issue.IssueDetails
        .All(d => d.PickedQuantity == d.QuantityToPick);
    
    if (!allPickedComplete)
        return false; // Chưa pick đủ
    
    // 3. Tất cả pick đủ → Chuyển Handover
    issue.Status = IssueStatus.Handover;
    await _db.SaveChangesAsync();
    return true;
}
```

---

## 🎯 Các API Endpoint Liên Quan

### Receipt (Phiếu Nhập)

| Endpoint | Method | Mô Tả |
|----------|--------|-------|
| `/api/receipts` | POST | Tạo phiếu nhập (Draft) |
| `/api/receipts/{id}/approve-qc` | POST | QA/QC duyệt (QC_Checked) |
| `/api/receipts/{id}/complete-put-away` | POST | Thủ kho cất hàng xong → Auto check Completed |
| `/api/receipts/{id}` | GET | Xem chi tiết phiếu (kiểm tra Status) |

### Issue (Phiếu Xuất)

| Endpoint | Method | Mô Tả |
|----------|--------|-------|
| `/api/issues` | POST | Tạo phiếu xuất (Pending) |
| `/api/issues/{id}/picking-plan` | GET | Lấy picking plan (Status → Picking) |
| `/api/issues/{id}/confirm-pick` | POST | Xác nhận pick → Auto check Handover |
| `/api/issues/{id}/handover` | POST | Xác nhận bàn giao |
| `/api/issues/{id}` | GET | Xem chi tiết phiếu (kiểm tra Status) |

---

## ⚠️ Xử Lý Lỗi

### Receipt:
- ❌ Nếu có ReceiptDetail với `ActualQuantity = 0` → Không auto-complete
- ❌ Nếu chưa được ghi vào InventoryTransaction → Không auto-complete
- ✅ Nếu đủ điều kiện → Chuyển Completed

### Issue:
- ❌ Nếu có IssueDetail chưa pick đủ (`PickedQuantity < QuantityToPick`) → Không auto-complete
- ✅ Nếu tất cả pick đủ → Chuyển Handover

---

## 🔄 Quy Trình Thực Tế

### Quy trình Inbound (Nhập hàng):
```
1. Admin tạo phiếu nhập (Draft)
   ↓
2. QA/QC duyệt phiếu (QC_Checked) + gán Zone
   ↓
3. Thủ kho mở app nhặt:
   - Quét mã hàng + Zone
   - Cộng tồn kho (Inventory ++)
   - Ghi InventoryTransaction
   ↓
4. Tất cả hàng cất xong?
   YES → System tự động chuyển Receipt → Completed ✅
   NO  → Thủ kho tiếp tục cất
```

### Quy trình Outbound (Xuất hàng):
```
1. Admin tạo phiếu xuất (Pending)
   ↓
2. System lấy picking plan FIFO (Picking)
   ↓
3. Thủ kho mở app picking:
   - Lấy hàng theo gợi ý vị trí
   - Quét mã hàng
   - Xác nhận pick (Quantity --)
   - Ghi InventoryTransaction
   ↓
4. Tất cả hàng pick xong?
   YES → System tự động chuyển Issue → Handover ✅
   NO  → Thủ kho tiếp tục pick
```

---

## 🧪 Kiểm Tra Tính Năng

### Test Receipt Completion:
```bash
# 1. Tạo phiếu nhập
curl -X POST http://localhost:5000/api/receipts \
  -H "Authorization: Bearer <token>" \
  -d '{...}'
# Response: receiptId = "abc-123", status = "Draft"

# 2. Duyệt phiếu
curl -X POST http://localhost:5000/api/receipts/abc-123/approve-qc \
  -d '{...}'
# Response: status = "QC_Checked"

# 3. Cất hàng (simulate)
curl -X POST http://localhost:5000/api/receipts/abc-123/complete-put-away
# Response: status = "Completed" (Auto) ✅

# 4. Kiểm tra
curl -X GET http://localhost:5000/api/receipts/abc-123
# Response: status = "Completed" ✅
```

### Test Issue Completion:
```bash
# 1. Tạo phiếu xuất
curl -X POST http://localhost:5000/api/issues \
  -d '{...}'
# Response: issueId = "xyz-789", status = "Pending"

# 2. Lấy picking plan
curl -X GET http://localhost:5000/api/issues/xyz-789/picking-plan
# Response: status = "Picking", picking plan items

# 3. Pick từng chi tiết
curl -X POST http://localhost:5000/api/issues/xyz-789/confirm-pick \
  -d '{ issueDetailId: "det-1", pickedQuantity: 10 }'
# Response: status = "Picking" (nếu còn chi tiết cần pick)
#         hoặc status = "Handover" (nếu tất cả pick xong) ✅

# 4. Kiểm tra
curl -X GET http://localhost:5000/api/issues/xyz-789
# Response: status = "Handover" ✅
```

---

## 📝 Ghi chú

- Logic kiểm tra chạy **tự động** sau mỗi lần cập nhật tồn kho
- Sử dụng **Database Transaction** để chống race condition
- Tương thích với **Global Query Filter** (auto filter theo WarehouseId)
- Không yêu cầu polling/timer - chỉ trigger khi cần thiết
