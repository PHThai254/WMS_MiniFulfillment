---
trigger: always_on
---

# WMS_MINIFULFILLMENT - GLOBAL AGENT RULES & SYSTEM CONTEXT

> **[CRITICAL SYSTEM DIRECTIVE]** > AI bắt buộc phải đọc và áp dụng toàn bộ bộ luật này trước khi sinh code, phân tích bug hoặc thiết kế hệ thống. Bất kỳ dòng code nào vi phạm các ràng buộc dưới đây đều bị coi là lỗi nghiêm trọng (Fatal Error).

## 1. KIẾN TRÚC PHẦN MỀM (CLEAN ARCHITECTURE 4 TẦNG)
- Hệ thống là Monolithic Architecture. Tuyệt đối KHÔNG tự vẽ vời Microservices, Kafka hay RabbitMQ.
- Tuân thủ nghiêm ngặt 4 tầng:
  1. **Domain:** Chỉ chứa Entities, Enums, Exceptions. Không phụ thuộc thư viện ngoài.
  2. **Application:** Chứa Interfaces (IRepository, IAiOcrService), DTOs, Use Cases/Services. Chỉ phụ thuộc Domain.
  3. **Infrastructure:** Chứa EF Core DbContext, Repository Impl, External APIs (Gemini).
  4. **API:** Chứa Controllers, Middlewares. Chỉ gọi xuống Application layer.

## 2. QUY TẮC BACKEND & DATABASE (ASP.NET CORE EF CORE)
- **Cấu trúc Dữ liệu Cốt lõi:** - `Inventory` (Tồn kho) là trái tim. `Inventory = ProductId + WarehouseId + ZoneId + Quantity`. Tuyệt đối KHÔNG lưu `Quantity` ở bảng `Products`.
  - Mọi thực thể giao dịch (Receipt, Issue, Inventory...) bắt buộc phải có `WarehouseId`.
- **Bảo mật & Phân quyền (RBAC):**
  - Sử dụng Cặp Token: Access Token (ngắn hạn) + Refresh Token (lưu DB). Viết sẵn API `/refresh-token`.
  - API phải được bảo vệ bằng `[Authorize(Roles="...")]`. Token Payload phải chứa claim `Role` và `WarehouseId`.
- **Luật Cứng về Routing (Chống lỗi 403):** Luôn khai báo Route tường minh. TUYỆT ĐỐI KHÔNG dùng ngoặc vuông bọc tên biến trong đường dẫn cấp cao.
  - ✅ Đúng: `[Route("api/Users")]`, `[Route("api/Receipts")]`, `[Route("api/TodoItems")]`
  - ❌ Sai: `[Route("api/[controller]")]`, `[Route("api/[Users]")]`
- **Race Condition & Performance:**
  - BẮT BUỘC dùng cơ chế `Concurrency Token` (`RowVersion` hoặc `Quantity`) của EF Core + `IDbContextTransaction` khi xuất/nhập kho. Cấm dùng `lock` thuần túy của C#.
  - Thêm `.AsNoTracking()` cho mọi API GET.
  - BẮT BUỘC dùng **Global Query Filter** trong `DbContext` để tự động lọc `WarehouseId` từ JWT. Cấm code tay `.Where(x => x.WarehouseId == id)` ở tầng Service.

## 3. QUY TẮC FRONTEND (WEB ADMIN - REACT VITE + ANT DESIGN)
- **Thư viện & CSS:** Bắt buộc dùng Ant Design. TUYỆT ĐỐI KHÔNG viết inline-style hay file `.css` thuần. Dùng `<Space>`, `<Row>`, `<Col>` để dàn layout.
- **Base Components:** Cấm gọi trực tiếp `<Button>`, `<Table>`. Bắt buộc import `<PrimaryButton>`, `<BaseTable>`, `<PageHeader>` từ `src/components`.
- **Form State:** Bắt buộc dùng `Form.useForm()` và `Form.useWatch` của AntD.
- **Layout Đồng nhất:**
  - SearchBar luôn ở góc trên TRÁI. 
  - Nút Action chính (Thêm, Lưu) luôn ở góc PHẢI. 
  - Cột Action trong Table (Sửa/Xóa) phải gộp vào 1 cột ngoài cùng.
- **AI OCR UI (Split View):** Giao diện duyệt OCR bắt buộc chia đôi màn hình: Trái (Ảnh có zoom) - Phải (JSON Form có viền đỏ cảnh báo).

## 4. QUY TẮC MOBILE APP (REACT NATIVE + EXPO + PAPER)
- **Kiến trúc UI:** Bắt buộc bọc mọi trang trong `<SafeAreaView>`. Nút bấm dùng `mode="contained"`, chữ to, tương phản cao.
- **Base Components:** Bắt buộc import `<ScannerButton>`, `<TaskCard>`, `<ScannerHeader>` từ `src/components`.
- **Điều hướng (React Navigation):** Thuộc tính `name` của Route phân biệt chính xác HOA/thường và phải khớp 100% với chuỗi trong `navigation.navigate()`.
- **Xử lý Barcode (Camera):** - Bắt buộc áp dụng Debounce/Throttle khóa Camera 2 giây sau khi quét để chống Double Scan.
  - Bắt rung thiết bị (`Vibration.vibrate()`) và nháy đỏ màn hình nếu quét sai mã.
- **Xử lý Mạng:** Bắt buộc cấu hình Axios Interceptors tự động bắt lỗi 401 để gọi ngầm Refresh Token và retry request. Không bắt user thao tác lại từ đầu nếu rớt mạng giữa chừng.

## 5. LUỒNG THUẬT TOÁN ĐẶC BIỆT
- **AI OCR Flow:** Gọi API Gemini (LLM Vision) bắt buộc dùng `async/await`. Phải ép prompt trả về thuần JSON. Bắt buộc có bọc `try-catch` khi Deserialize. Kết quả phải hiển thị lên UI cho QA/QC duyệt trước khi insert DB (Human in the loop).
- **Thuật toán FIFO (GeneratePickingPlanService):** Khi lập lệnh xuất kho, bắt buộc truy vấn `Inventory` theo `ProductId`, sắp xếp `OrderBy LastRestockedDate ASC`. Thực hiện trừ lùi cạn từng Zone cũ đến khi đủ `TotalNeeded`.

## 6. RED LINES (NHỮNG ĐIỀU CẤM KỴ - KHÔNG ĐƯỢC PHÉP LÀM)
1. Cấm Tầng API gọi trực tiếp DbContext.
2. Cấm cập nhật số lượng tồn kho thẳng vào bảng `Products`.
3. Cấm nhồi nhét logic nghiệp vụ vào Controller.
4. Cấm sinh code thừa (bỏ qua `bin/`, `obj/`, `node_modules/`, `.expo/`).