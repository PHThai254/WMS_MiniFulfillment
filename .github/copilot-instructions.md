# WMS_MiniFulfillment - AI Copilot Instructions & System Context

> Đây là tài liệu ngữ cảnh bắt buộc. Bất cứ khi nào tôi yêu cầu viết code, giải quyết bug, hoặc vẽ sơ đồ PlantUML (System/Software Architecture, Sequence Diagram,...), bạn PHẢI đọc kỹ các quy tắc và luồng nghiệp vụ dưới đây.

## 1. MÔ HÌNH TRIỂN KHAI VÀ KIẾN TRÚC PHẦN MỀM 

- **Mô hình Triển khai (System Architecture):** Monolithic Architecture (Kiến trúc Nguyên khối). 
  - Toàn bộ Backend chạy trên 1 server duy nhất.
  - Client giao tiếp qua RESTful API.
  - Không sử dụng Docker Swarm, Không Kubernetes, Không Microservices, Không Message Queue bên ngoài (RabbitMQ/Kafka).
- **Kiến trúc Mã nguồn (Software Architecture):** Clean Architecture 4 tầng nghiêm ngặt:
  1. `Domain`: Chứa Entities (Product, Warehouse, Zone, Inventory, Receipt...), Enums, Exceptions. Không phụ thuộc vào ai.
  2. `Application`: Chứa Interfaces (Repositories, External Services), DTOs, Use Cases/Services. Chỉ phụ thuộc vào Domain.
  3. `Infrastructure`: Chứa DbContext (EF Core 10), Implementations của Repositories, AI API call (Gemini). Phụ thuộc Application & Domain.
  4. `API`: Chứa Controllers, Middlewares. Phụ thuộc Application & Infrastructure (để DI Setup).

## 2. NGHIỆP VỤ & ACTOR (Dành cho Dataflow và Workflow)

Hệ thống có 3 Actor với các quy trình (Workflow) tách biệt:
1. **Admin (Web React):** Tạo danh mục, Tạo Đa kho (Warehouse) và Zone (Khu vực phẳng, không quản lý Kệ/Tầng). Tạo Phiếu nhập/Xuất.
2. **QA/QC (Web/Mobile):** Nhận ảnh chụp hóa đơn -> Gọi API AI OCR để bóc tách thành dữ liệu JSON -> Đối chiếu thực tế -> Bấm Duyệt nghiệm thu.
3. **Thủ kho (Mobile React Native):** Cầm máy đi quét Barcode. 
   - **Put-away (Cất hàng):** Nhận lệnh -> Quét mã Hàng + Mã Zone -> Cộng tồn kho (Inventory).
   - **Picking (Nhặt hàng):** Nhận lệnh xuất -> App gợi ý vị trí theo thuật toán FIFO -> Đến nơi quét mã -> Trừ tồn kho -> Đổi trạng thái Bàn giao (Tracking).

## 3. THIẾT KẾ DỮ LIỆU CỐT LÕI (Data Model Rules)

- **Tách biệt Dữ liệu:** Bảng `Products` (chỉ chứa thông tin tĩnh, Barcode, SKU). Bảng `Inventory` (chỉ chứa Quantity, lưu trữ theo WarehouseId và ZoneId).
- **Multi-warehouse Lite:** 1 Phiếu nhập/Xuất chỉ thuộc về 1 Kho. Mọi dữ liệu giao dịch và tồn kho đều phải gắn với `WarehouseId`.

## 4. QUY TẮC BACKEND (Bắt buộc tuân thủ 100%)

- **Global Query Filter:** BẮT BUỘC cấu hình trong `ApplicationDbContext` để tự động lọc dữ liệu `Inventory`, `Receipts`, `Issues` theo `WarehouseId` được lấy từ JWT Token của người dùng.
- **Trái tim của hệ thống:** Tồn kho (Inventory) không nằm trong bảng Products. `Inventory = ProductId + WarehouseId + ZoneId + Quantity`.
- **Cộng/Trừ kho:** Mọi luồng Import/Export bắt buộc phải đi qua các bảng Detail (Ví dụ: `ReceiptDetail`, `IssueDetail`). Logic cộng/trừ phải nằm trong Service layer ở tầng `Application`.
- **Chống Xung đột dữ liệu (Race Condition):** BẮT BUỘC sử dụng cơ chế `Concurrency Token` trong Entity Framework Core (chọn trường `RowVersion` hoặc trường `Quantity` làm ConcurrencyCheck), kết hợp Database Transaction tại API Xuất/Nhập kho để tránh xuất âm hàng hóa.
- **Quản lý Transaction & Performance:** - Bắt buộc dùng `IDbContextTransaction` khi lưu phiếu Nhập/Xuất: Thành công tất cả thì commit, lỗi 1 bước thì rollback.
  - Tránh lỗi N+1 Query: Luôn sử dụng `.Include()` chủ đích.
  - Bổ sung `.AsNoTracking()` cho tất cả các API GET danh sách.
- **Bảo mật:** JWT Secret Key đọc từ biến môi trường/User Secrets. Phân quyền (Admin/QA_QC/Staff) phải xử lý bằng `[Authorize(Roles="...")]` ở Controller.

## 5. QUY TẮC MOBILE APP & WEB FRONTEND

- **Cấu trúc:** Tách biệt UI Components và logic gọi API. Quản lý Token (Access) an toàn, gắn vào HTTP Header bằng Axios Interceptors.
- **Mobile App (Xử lý Barcode):**
  - **Debounce / Throttle:** BẮT BUỘC áp dụng kỹ thuật ngắt tín hiệu khi quét Barcode (VD: sau khi quét, block camera trong 2 giây) để chống gọi API trừ kho nhiều lần do lỗi Double Scan.
  - **Luồng Camera:** Xử lý triệt để luồng xin quyền truy cập Camera (Expo Camera), bắt lỗi từ chối quyền.
- **Xử lý Offline/Lỗi mạng:** Khi thao tác cất/nhặt hàng lỗi do mạng, không xóa trắng màn hình để Thủ kho không phải làm lại từ đầu.

## 6. QUY TẮC XỬ LÝ AI OCR

- **Luồng Xử lý Bất đồng bộ:** Gọi API LLM Vision bắt buộc dùng `async/await` để không block thread của Backend server.
- **Human in the Loop:** Kết quả OCR từ AI (JSON) trả về Backend phải được Mapping thành một DTO trả về cho Client. Giao diện phải hiện form cho QA/QC xem, sửa và BẤM DUYỆT trước khi insert vào DB.
- **Bảo vệ tính toàn vẹn JSON:** Prompt gửi lên LLM bắt buộc phải có câu lệnh ép định dạng đầu ra chỉ chứa thuần JSON, không có Markdown hay text giải thích thừa. Cần có Try/Catch bọc bước `JsonSerializer.Deserialize`.

## 7. 🚫 NHỮNG ĐIỀU AI KHÔNG ĐƯỢC LÀM (Strict Constraints)

1. **KHÔNG break Clean Architecture:** Tầng API không được gọi trực tiếp `DbContext`. Mọi thao tác DB phải qua Interface (Repository) ở tầng Application.
2. **KHÔNG viết thủ công lệnh lọc WarehouseId:** Khi Get danh sách, KHÔNG tự ý viết `.Where(x => x.WarehouseId == id)` ở các Service. Hãy để Global Query Filter tự lo liệu.
3. **KHÔNG sinh logic phức tạp ở Controller:** Controller chỉ được phép làm 3 việc: Nhận Request -> Chuyển xuống Application Service -> Trả về HTTP Status 200/400.
4. **KHÔNG dùng Lock cơ bản cho Race Condition:** Không dùng `lock` object của C#. Bắt buộc dùng cơ chế của Database/EF Core.
5. **KHÔNG cập nhật số lượng thẳng vào bảng `Products`:** Quantity chỉ tồn tại ở `Inventory`.