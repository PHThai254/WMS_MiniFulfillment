# Picking Plan FIFO API - Tài liệu Tham khảo

## 📌 Tóm tắt
API sinh lộ trình nhặt hàng chi tiết theo thuật toán FIFO (First-In-First-Out) đã được triển khai hoàn chỉnh với:
- **Endpoint:** `GET /api/issues/{id:guid}/picking-plan`
- **Authorization:** Staff, Admin
- **Response:** PickingPlanDto (danh sách vị trí nhặt hàng + số lượng)

## 🔗 Các Thành Phần Chính

### 1. **Entity & Database**
- **Inventory:** Tồn kho theo ZoneId + ProductId
  - `LastRestockedDate`: Ngày cất hàng (dùng cho FIFO)
  - `RowVersion`: Concurrency Token chống Race Condition

### 2. **DTOs** (WMS.Application/DTOs/Operations)
```csharp
public record PickingPlanDto(
    Guid IssueId,
    List<PickingPlanItemDto> Items
);

public record PickingPlanItemDto(
    Guid IssueDetailId,
    Guid ProductId,
    string ProductName,
    string ProductBarcode,
    Guid ZoneId,
    string ZoneName,
    int QuantityToPick,
    DateTime RestockedDate
);
```

### 3. **Service Interface** (IIssueService)
- Method: `Task<PickingPlanDto> GeneratePickingPlanAsync(Guid issueId)`

### 4. **API Endpoint** (IssuesController)
```csharp
[HttpGet("{id:guid}/picking-plan")]
[Authorize(Roles = "Staff,Admin")]
public async Task<ActionResult<ApiResponse<PickingPlanDto>>> GetPickingPlan(Guid id)
{
    var data = await _service.GeneratePickingPlanAsync(id);
    return Ok(ApiResponse<PickingPlanDto>.Succeeded(data, "Lộ trình nhặt hàng FIFO đã được tạo."));
}
```

## 🎯 FIFO Split Allocation Algorithm (Chi tiết)

### Luồng xử lý:
1. **Đầu vào:** IssueId → lấy danh sách IssueDetail (mỗi detail = ProductId + QuantityToPick)
2. **Lặp từng chi tiết:**
   - Tính `remaining = QuantityToPick - PickedQuantity` (còn cần nhặt bao nhiêu)
   - Nếu remaining ≤ 0: Bỏ qua (đã nhặt đủ)
3. **FIFO - Sắp xếp hàng cũ nhất:**
   - Query: `Inventories.Where(ProductId == detail.ProductId && Quantity > 0).OrderBy(LastRestockedDate)`
4. **Trừ lùi (Split):**
   - Với mỗi Inventory (sorted):
     - `qty = Min(inv.Quantity, remaining)` → lấy cái nhỏ hơn
     - Thêm vào planItems: `{ZoneId, qty, LastRestockedDate}`
     - `remaining -= qty` → cập nhật số còn lại
5. **Đầu ra:** List<PickingPlanItemDto> → gợi ý cụ thể cho nhân viên

### Ví dụ thực tế:
```
Yêu cầu: Xuất 100 cái Sản phẩm A từ Kho 1
Tồn kho hiện tại:
  - Zone A: 30 cái (nhập 2024-01-01)
  - Zone B: 25 cái (nhập 2024-02-01)
  - Zone C: 50 cái (nhập 2024-01-15)

Lộ trình FIFO:
  1. Lấy 30 từ Zone A (hàng cũ nhất)
  2. Lấy 50 từ Zone C (hàng thứ 2)
  3. Lấy 20 từ Zone B (hàng mới nhất, lấy 20/25)
  
Result: [
  {ZoneId: A, Qty: 30, RestockedDate: 2024-01-01},
  {ZoneId: C, Qty: 50, RestockedDate: 2024-01-15},
  {ZoneId: B, Qty: 20, RestockedDate: 2024-02-01}
]
```

## 📂 Vị trí File Code
- **Service:** `backend/WMS.Infrastructure/Services/Operations/OperationServices.cs` (line 408)
- **Controller:** `backend/WMS.API/Controllers/OperationControllers.cs` (line 197)
- **DTO:** `backend/WMS.Application/DTOs/Operations/IssueDto.cs` (line 39-49)

## ✅ Tính năng bảo mật & Chất lượng
- ✔ Sử dụng Global Query Filter (tự lọc theo WarehouseId)
- ✔ Transaction an toàn (DbTransaction bọc)
- ✔ Include() tránh N+1 query
- ✔ AsNoTracking() cho GET
- ✔ Concurrency Token (RowVersion)
- ✔ Clean Architecture (Service → Repository)
