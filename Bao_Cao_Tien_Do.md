# 📊 Báo cáo Tổng hợp Tiến độ Dự án — WMS Mini Fulfillment

> **Thời gian cập nhật:** 02/06/2026 · **Branch:** `main` · **HEAD:** `74c37a5`
> **Role phân tích:** Senior Tech Lead

---

## 1. 🗓️ Tổng quan Tiến độ

| Tuần | Hạng mục | Tiến độ |
|---|---|---|
| Tuần 1–3 | Thiết kế hệ thống, ERD, Auth, RBAC | ✅ Hoàn thành |
| Tuần 4 | Quản trị Master Data (Product, Warehouse, Zone, Nhân sự, Barcode PDF) | ✅ Hoàn thành |
| Tuần 5 | Inbound Giai đoạn 1: OCR Upload, Gemini AI, Duyệt phiếu → `QC_Checked` | ✅ Hoàn thành |
| Tuần 6 | Inbound Giai đoạn 2: Put-away, Concurrency Token, Auto Completion | ✅ Hoàn thành |
| Tuần 7 | Outbound Giai đoạn 1: Tạo Issue, Thuật toán FIFO, Lộ trình nhặt hàng, Real-time Tracking | ✅ Hoàn thành |
| **Tuần 8** | **Outbound Giai đoạn 2: Mobile Picking (đang bắt đầu)** | 🟡 Đang chạy |
| Tuần 9–11 | Dashboard, Logistics, Testing, Demo | 🔲 Chưa bắt đầu |

**Hiện tại: Kết thúc Tuần 7, bắt đầu Tuần 8 (01/06–07/06)**. Nhóm đang bám sát tiến độ đặt ra.

---

## 2. 🔍 Chi tiết Từng chức năng đã Code (theo commit mới nhất)

---

### 2.1. [Tuần 5] OCR Validation — Upload ảnh & hiển thị kết quả Gemini AI
**Commit:** `efc9954` · **Tác giả:** Dũng
**Tài liệu đi kèm:** `OCR_FLOW_DOCUMENTATION.md` (625 dòng)

**Các file bị ảnh hưởng:**
- `web-admin/src/components/ocr/OcrValidation.tsx` *(mới — 453 dòng)*
- `web-admin/src/api/ocrService.ts` *(mới)*
- `web-admin/src/api/productService.ts`, `supplierService.ts`, `zoneService.ts` *(mới)*
- `web-admin/src/pages/operations/OcrPage.tsx` *(mới)*
- `backend/WMS.API/Controllers/OcrController.cs` *(cập nhật)*
- `backend/WMS.Application/DTOs/Operations/SaveOcrReceiptRequest.cs` *(mới)*

**Logic hoạt động:**
- Component `OcrValidation.tsx` là màn hình **Split View** theo đúng yêu cầu kế hoạch:
  - **Cột trái:** Drag & Drop upload ảnh hóa đơn (giới hạn 5MB), xem ảnh preview trực tiếp.
  - **Cột phải:** Hiển thị form dữ liệu đã được Gemini bóc tách — các field có độ tin cậy < 70% được đánh dấu viền đỏ (`suspiciousFields`).
- Sau khi QA/QC điều chỉnh dữ liệu, bấm **"Duyệt & Lưu"** gọi `ocrService.saveReceiptFromOcr()`.
- `SaveReceiptFromOcrAsync` ở Backend tạo phiếu nhập **trực tiếp ở trạng thái `QC_Checked`** và cộng tồn kho ngay lập tức.

---

### 2.2. [Tuần 6] Concurrency Token bảo vệ Put-away
**Commit:** `b21e520` · **Tác giả:** Thái

**Các file bị ảnh hưởng:**
- `backend/WMS.Domain/Entities/Inventory.cs`
- `backend/WMS.Infrastructure/Data/ApplicationDbContext.cs`
- `backend/WMS.Infrastructure/Migrations/20260531225855_AddRowVersionToInventory.cs` *(mới)*
- `backend/WMS.Infrastructure/Services/Operations/OperationServices.cs`

**Logic hoạt động:**
- Thêm column `RowVersion` (kiểu `byte[]`, tự động tăng bởi SQL Server) vào bảng `Inventories`.
- EF Core tự động nhúng `WHERE RowVersion = @original_version` vào mọi câu lệnh UPDATE.
- Nếu hai thủ kho đồng thời cất cùng một mã hàng vào cùng một zone, người thứ 2 sẽ nhận `DbUpdateConcurrencyException` → xử lý gracefully, tránh corrupt dữ liệu tồn kho.

---

### 2.3. [Tuần 6] CompletionCheckService — Tự động chuyển trạng thái phiếu
**Commit:** `d6542e6` · **Tác giả:** Thái
**Tài liệu:** `backend/COMPLETION_CHECK_GUIDE.md`, `COMPLETION_CHECK_IMPLEMENTATION.md`

**Các file bị ảnh hưởng:**
- `backend/WMS.Infrastructure/Services/Operations/CompletionCheckService.cs` *(mới — 125 dòng)*
- `backend/WMS.Application/Interfaces/ICompletionCheckService.cs` *(mới)*
- `backend/WMS.Infrastructure/DependencyInjection.cs`

**Logic hoạt động:**
- `ICompletionCheckService` được inject vào cả `ReceiptService` và `IssueService`.
- **`CheckAndCompleteReceiptAsync`:** Sau mỗi lần Put-away, kiểm tra toàn bộ `ReceiptDetail` có `ActualQuantity > 0`. Nếu TẤT CẢ đều đã có `InventoryTransaction` tương ứng (type = `INBOUND`) → tự động set `Receipt.Status = Completed`.
- **`CheckAndCompleteIssueAsync`:** Sau mỗi lần Picking, kiểm tra `PickedQuantity == QuantityToPick` trên tất cả `IssueDetail` → tự động set `Issue.Status = Handover`.
- Cả hai đều chạy trong Transaction riêng, đảm bảo Rollback nếu xảy ra lỗi.

---

### 2.4. [Tuần 6] Seed Data tự động bằng Bogus + Luồng dữ liệu tiền tệ
**Commit:** `6e3ddfd` · **Tác giả:** Thái

**Các file bị ảnh hưởng:**
- `backend/WMS.Infrastructure/Data/DataSeeder.cs` *(mới)*
- `backend/WMS.Infrastructure/Migrations/20260525095817_AddPriceAndUnitPrice.cs` *(mới)*
- `backend/WMS.Domain/Entities/Product.cs`, `ReceiptDetail.cs`
- `web-admin/src/helpers/formatters.ts` *(mới)*

**Logic hoạt động:**
- Thêm trường `Price` vào `Product` và `UnitPrice` vào `ReceiptDetail`, có migration đầy đủ.
- `DataSeeder.cs` sử dụng thư viện `Bogus` để tự động sinh data test: tên sản phẩm, giá tiền, số lượng ngẫu nhiên nhưng có tính hiện thực.
- `formatters.ts` ở Frontend chuẩn hóa hiển thị tiền tệ VND cho toàn bộ Web Admin.

---

### 2.5. [Tuần 7] Thuật toán FIFO — Sinh lộ trình nhặt hàng
**Commit:** `74c37a5` · **Tác giả:** Thái
**Tài liệu:** `backend/PICKING_PLAN_FIFO_API.md`

**Các file bị ảnh hưởng:**
- `backend/WMS.Infrastructure/Services/Operations/OperationServices.cs` (`GeneratePickingPlanAsync`)
- `backend/WMS.API/Controllers/OperationControllers.cs`

**Logic hoạt động — FIFO Split Allocation:**
```csharp
// Với mỗi IssueDetail, truy vấn Inventory theo ProductId
// Sắp xếp ASC theo LastRestockedDate → ưu tiên hàng nhập cũ nhất
var inventories = await _db.Inventories
    .Where(i => i.ProductId == detail.ProductId && i.Quantity > 0)
    .OrderBy(i => i.LastRestockedDate)
    .ToListAsync();

// Phân bổ số lượng từ nhiều zone nếu 1 zone không đủ hàng
foreach (var inv in inventories) {
    var qty = Math.Min(inv.Quantity, remaining);
    planItems.Add(new PickingPlanItemDto(...));
    remaining -= qty;
}
```
- Khi API `GET /picking-plan/{issueId}` được gọi, Issue **tự động chuyển sang trạng thái `Picking`**.
- Kết quả trả về là danh sách `PickingPlanItemDto` chứa Zone, Barcode, Số lượng, Ngày nhập — đủ để Mobile App và Web Admin hiển thị lộ trình nhặt hàng.

---

### 2.6. [Tuần 7] Real-time Tracking trên Web Admin
**Commit:** `f07b11d` · **Tác giả:** Dũng

**Các file bị ảnh hưởng:**
- `web-admin/src/pages/operations/IssuesPage.tsx` *(cập nhật lớn — 332 dòng)*

**Logic hoạt động:**
- Trang `IssuesPage.tsx` hiển thị Picking Plan dưới dạng modal **"Preview lấy hàng"** với:
  - **Steps component** thể hiện thứ tự các bước di chuyển trong kho theo FIFO.
  - **Statistic Cards** tổng hợp: Tổng SP cần lấy, Số zone gợi ý, Số bước lộ trình.
  - **Progress bar** theo từng dòng: `pickedQuantity / quantityToPick × 100%`.
- **Auto-refresh mỗi 5 giây** (`setInterval(fetchIssues, 5000)`) để theo dõi tiến độ nhặt hàng real-time từ Mobile App.

---

## 3. 🔗 Điểm nối Logic Tổng thể

```
[Admin tạo phiếu xuất]
        │
        ▼
IssueService.CreateAsync() → Status: Pending
        │
        ▼
[Admin/QC bấm "Preview lấy hàng"]
        │
        ▼
IssueService.GeneratePickingPlanAsync()
  → FIFO Algorithm: Sort Inventory by LastRestockedDate
  → Status: Pending → Picking
  → Trả về PickingPlanDto (Zone + Barcode + Qty)
        │
        ▼
[Mobile App: Thủ kho mở Picking List]
  → Quét barcode đối chiếu gợi ý
  → IssueService.ConfirmPickAsync() → trừ tồn kho
  → CompletionCheckService.CheckAndCompleteIssueAsync()
    → Nếu tất cả PickedQuantity == QuantityToPick → Status: Handover
        │
        ▼
[Web Admin: Bàn giao vận chuyển]
  → IssueService.HandoverAsync()
```

---

## 4. 🔎 Code Review — Đánh giá Chất lượng

### ✅ Điểm mạnh
| Hạng mục | Nhận xét |
|---|---|
| **Concurrency Token** | Implement chuẩn EF Core `[Timestamp]` / `RowVersion` — rất quan trọng cho môi trường đa người dùng cùng cất hàng. |
| **FIFO Algorithm** | Logic Split Allocation chính xác, hỗ trợ lấy từ nhiều Zone khi 1 Zone không đủ hàng. |
| **CompletionCheckService** | Tách bạch thành Service riêng, inject qua Interface — dễ test, dễ mở rộng. Dùng Transaction độc lập đảm bảo an toàn. |
| **Real-time Polling** | `setInterval` 5 giây là giải pháp đơn giản, đủ dùng cho demo. Không gây vấn đề UX đáng kể. |
| **OcrValidation UX** | UI Split View chuẩn theo spec, highlight field nghi ngờ bằng border đỏ giúp QA/QC làm việc nhanh hơn. |

### ⚠️ Lỗi tiềm ẩn & Đề xuất cải thiện

| # | Vấn đề | Vị trí | Đề xuất |
|---|---|---|---|
| 1 | `RunOcrAsync` vẫn đang trả về **mock data cứng** thay vì gọi thật Gemini API | `OperationServices.cs` L.211–224 | Kết nối thực vào `GeminiOcrService.RunOcrAsync()`. Đây là lỗi nghiêm trọng nếu demo. |
| 2 | `SaveReceiptFromOcrAsync` lấy `WarehouseId` từ Zone đầu tiên trong danh sách (`request.Items.First()`) — sẽ lỗi nếu danh sách rỗng | `OperationServices.cs` L.251 | Validate `request.Items.Any()` trước, hoặc lấy `WarehouseId` từ JWT Claims. |
| 3 | `CompletionCheckService.CheckAndCompleteReceiptAsync` đang mở Transaction riêng sau khi `CompletePutAwayAsync` đã commit xong — gọi kép không cần thiết | `OperationServices.cs` L.198–203 | Tích hợp logic kiểm tra vào cùng Transaction của `CompletePutAwayAsync`, bỏ Transaction trong `CompletionCheckService` cho luồng Receipt. |
| 4 | ~~`IssuesPage.tsx` sử dụng `useEffect` với `fetchIssues` trong dependency array của effect load warehouse/customer/product — sẽ trigger load lại mỗi khi auto-refresh~~ | `IssuesPage.tsx` L.64–71 | ✅ Đã xử lý xong. Tách dependency: `useEffect(() => { loadOptions(); }, [])` riêng, không phụ thuộc `fetchIssues`. |
| 5 | `GeminiOcrService` và `OcrController` thiếu timeout config — ảnh nặng có thể gây lỗi 504 | `GeminiOcrService.cs` | Thêm `HttpClient.Timeout` và cân nhắc thêm `Polly` Retry. |

### 🚨 Critical: Đã xử lý xong trước Demo
> **Mock OCR (#1):** Thái nghỉ ốm nên đã có bản fix gấp: `RunOcrAsync` hiện tại đã được kết nối thực tế tới `GeminiOcrService.ExtractInvoiceDataAsync`. HttpClient được bổ sung timeout 120s trong `DependencyInjection.cs`. Lỗi gọi kép Transaction ở `CompletePutAwayAsync` cũng đã được tối ưu. Luồng AI OCR đã sẵn sàng hoạt động thật.

---

## 5. 📋 Việc cần làm — Tuần 8 (01/06–07/06)

| Đầu việc | Người | Trạng thái |
|---|---|---|
| Xây dựng API Xác nhận nhặt hàng (Trừ tồn kho bằng Transaction) | Thái | ✅ Đã hoàn thành |
| Xây dựng màn hình Picking List (lộ trình FIFO) trên Mobile | Đức Anh | ✅ Đã hoàn thành |
| Xây dựng luồng Picking Scanner (quét mã đối chiếu gợi ý) | Dũng | ✅ Đã hoàn thành |
| Haptic Feedback khi quét sai mã | Dũng | ✅ Đã hoàn thành |
| Tích hợp gọi API trừ tồn kho sau khi quét đúng | Đức Anh | ✅ Đã hoàn thành |
| **Fix Mock OCR → Gemini thật** | Thái | ✅ Đã hoàn thành |

---

*Báo cáo được tạo tự động bởi AI Tech Lead Analysis · Cập nhật lần cuối: 29/06/2026 21:10*
