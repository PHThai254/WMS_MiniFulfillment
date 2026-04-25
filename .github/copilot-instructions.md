# WMS_MiniFulfillment - AI Copilot Instructions & System Context

> Đây là tài liệu ngữ cảnh bắt buộc AI tuân thủ khi được yêu cầu viết code, xây dựng giao diện, giải quyết bug, hoặc vẽ sơ đồ PlantUML (System/Software Architecture, Sequence Diagram,...).
> Dưới đây là các quy tắc và luồng nghiệp vụ cần tuân thủ nghiêm ngặt.

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

## 2. NGHIỆP VỤ & ACTOR (Dataflow và Workflow)

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
- **Bảo mật & Authentication:** 
  - BẮT BUỘC triển khai cơ chế **Cặp Token**: Sinh Access Token (thời hạn ngắn, VD: 15-30 phút) và Refresh Token (thời hạn dài, VD: 7 ngày, lưu vào Database).
  - Phải viết một API riêng `POST /api/auth/refresh-token` để cấp lại Access Token mới khi Client gửi lên Refresh Token hợp lệ.
  - Phân quyền (Admin/QA_QC/Staff) phải xử lý bằng `[Authorize(Roles="...")]` ở Controller. JWT Secret Key đọc từ `appsettings.json` hoặc User Secrets.

## 5. QUY TẮC MOBILE APP & WEB FRONTEND

- **Cấu trúc & Xử lý Token:** Tách biệt UI Components và logic gọi API.
  - Lưu trữ cặp Token an toàn (Web dùng Zustand + LocalStorage/Cookie; Mobile dùng SecureStore).

  - BẮT BUỘC dùng Axios Interceptors: Request Interceptor tự động gắn Access Token vào Header. Response Interceptor tự động bắt mã lỗi 401 (Unauthorized), gọi ngầm API /refresh-token để lấy token mới, sau đó tự động retry (gửi lại) request vừa bị lỗi mà không làm văng người dùng ra màn hình Đăng nhập.

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

## 8. QUY TẮC THIẾT KẾ GIAO DIỆN (UI/UX CONSTRAINTS)

Khi được yêu cầu viết code giao diện (Frontend/Mobile), BẮT BUỘC tuân thủ các quy chuẩn thiết kế "Utility-First" (Ưu tiên công năng) sau đây:

### 8.1. Đối với Web Admin (React Vite)
- **Thư viện bắt buộc:** Sử dụng Ant Design (`antd`) cho mọi Component (Table, Form, Button, Modal, Layout). 
- **Cấm viết CSS thuần:** Tuyệt đối KHÔNG viết file `.css` hoặc `.scss` rời. KHÔNG dùng inline-style (ví dụ: `style={{ margin: 10 }}`). Nếu cần căn chỉnh khoảng cách, dùng các component bố cục của AntD như `<Space>`, `<Row>`, `<Col>` hoặc tiện ích class của thư viện.
- **Bố cục (Layout):** Mọi trang quản lý phải tuân theo cấu trúc: 
  1. Tiêu đề trang (Breadcrumb/Header).
  2. Thanh công cụ (Bộ lọc Search + Nút "Thêm mới" nằm bên phải).
  3. Bảng dữ liệu (`<Table>` của AntD) có phân trang (Pagination).
- **Trạng thái UI:** Bắt buộc phải xử lý `loading={true}` cho các nút bấm gọi API và Table khi đang fetch dữ liệu. Dùng `message.success()` hoặc `message.error()` của AntD để thông báo kết quả.
- **Đồng nhất Vị trí (Positioning):** - BẮT BUỘC: Thanh tìm kiếm (SearchBar) luôn nằm ở góc trên BÊN TRÁI của vùng dữ liệu.
  - BẮT BUỘC: Các nút hành động chính ("Thêm mới", "Lưu", "Duyệt") luôn nằm ở góc BÊN PHẢI.
  - BẮT BUỘC: Các nút thao tác trong mỗi dòng của Table (View/Edit/Delete) phải được gom vào một cột tên là "Hành động" (Action) nằm ở TRÁI hoặc PHẢI cùng. Cấm rải rác.
- **Đồng nhất Màu sắc & Trạng thái:** - BẮT BUỘC dùng màu mặc định của AntD/Paper. KHÔNG tự ý chèn mã màu Hex (`#FF0000`).
  - Nút Xóa (Delete) bắt buộc dùng thuộc tính `danger` của AntD.
  - Nút Tạo/Lưu (Create/Save) bắt buộc dùng thuộc tính `type="primary"`.
- **BẮT BUỘC SỬ DỤNG BASE COMPONENTS:** Khi code Web Admin, tuyệt đối không gọi trực tiếp <Button>, <Table> từ antd. Bắt buộc import <PrimaryButton>, <PageHeader> và <BaseTable> từ thư mục src/components.

### 8.2. Đối với Mobile App (React Native)
- **Thư viện bắt buộc:** Tuyệt đối KHÔNG dùng các thẻ HTML (`div`, `span`). BẮT BUỘC dùng các thẻ của `react-native` (`View`, `Text`, `StyleSheet`). Sử dụng `react-native-paper` cho các UI Component phức tạp.
- **Thiết kế "Công nghiệp":** - Nút bấm (Button) phải to, rõ ràng, có thuộc tính `mode="contained"`. 
  - Text hiển thị mã Barcode hoặc Tên sản phẩm phải dùng size chữ lớn (ít nhất 18px), in đậm (`fontWeight: 'bold'`).
- **An toàn màn hình:** Mọi màn hình phải được bọc trong `<SafeAreaView>` để không bị lẹm vào tai thỏ/camera của điện thoại.
- **Tương tác:** Không dùng hiệu ứng animation rườm rà. Nếu có danh sách dữ liệu, bắt buộc dùng `<FlatList>` để tối ưu hiệu năng, không dùng `<ScrollView.map>`.
- **BẮT BUỘC SỬ DỤNG BASE COMPONENTS:** Khi tạo giao diện tương tác, tuyệt đối KHÔNG gọi trực tiếp `<Button>`, hay tự vẽ Card. Bắt buộc import `<ScannerButton>`, `<TaskCard>` và `<ScannerHeader>` từ thư mục `src/components`

## 9. ĐẶC TẢ CHI TIẾT MÀN HÌNH (SCREEN BLUEPRINTS)

Khi được yêu cầu tạo UI, BẮT BUỘC đọc kỹ cấu trúc của từng màn hình dưới đây để gen code chính xác:

### 9.1. Giao diện Web Admin (ReactJS + Vite + Ant Design)
- **Bố cục chung (Layout):** Sử dụng Layout của AntD gồm Sidebar (Menu trái), Header (Thông tin User & Nút Đăng xuất), và Main Content.

**Nhóm Master Data:**
- **WarehouseList (Quản lý Kho):** Dùng AntD Table (Tên kho, Địa chỉ). Thêm/Sửa bằng AntD Modal.
- **ZoneList (Quản lý Khu vực):** Phải có Dropdown chọn Kho để lọc. AntD Table (Tên Zone, Sức chứa).
- **ProductList (Quản lý Sản phẩm):** AntD Table (SKU, Barcode, Tên, Danh mục). Cột Action bắt buộc có nút "In Barcode" (tạo PDF).
- **UserManagement (Quản lý Nhân sự):** Bảng gán Role (Admin/QA/Staff) và gán `WarehouseId`.

**Nhóm Transaction & AI:**
- **Dashboard:** Dùng AntD Statistic Cards cho "Phiếu đang chờ". Dùng Recharts vẽ biểu đồ cột "Top 5 sản phẩm sắp hết hàng".
- **Planning (Lập kế hoạch):** Form tạo lệnh tổng (Chọn Kho, Ngày) + Bảng thêm chi tiết mã hàng cần Nhập/Xuất.
- **OcrValidation (Duyệt Hóa Đơn OCR):** BẮT BUỘC dùng bố cục Split View (Chia đôi màn hình). 
  - *Trái:* AntD Upload để tải ảnh hóa đơn + Trình xem ảnh có tính năng zoom.
  - *Phải:* Form chứa dữ liệu JSON do AI trả về. Cấu hình CSS viền đỏ cho các Input mà AI báo "Nghi ngờ mờ". Nút "Duyệt & Lưu" kích thước lớn ở góc dưới.

### 9.2. Giao diện Mobile App (React Native + Expo + RN Paper)
- **Triết lý UI:** Nút bấm size lớn, chữ tương phản cao, thao tác 1 chạm. Bắt buộc bọc trong `<SafeAreaView>`.

**Nhóm Khởi động & Điều hướng:**
- **LoginScreen:** Input to rõ. Đăng nhập thành công phải lưu `WarehouseId` vào `AsyncStorage`.
- **HomeScreen (Task List):** Dùng UI Tab với 2 tab: "Chờ Cất Hàng" và "Chờ Nhặt Hàng". Dùng `<FlatList>` render các Card (Mã phiếu, Số lượng, Giờ tạo).

**Nhóm Máy quét (Barcode Scanners):**
- **PutAwayScanner (Cất hàng):** Luồng 3 bước tĩnh trên 1 màn hình.
  - Bước 1: Mở Camera, text hướng dẫn "QUÉT MÃ SẢN PHẨM".
  - Bước 2: Đổi text hướng dẫn "QUÉT VỊ TRÍ CẤT (ZONE)".
  - Bước 3: Hiện TextInput nhập số lượng (có nút +/- lớn). Bấm Xác nhận gọi API cộng tồn.
- **PickingScanner (Nhặt hàng FIFO):** - Text siêu lớn báo vị trí lấy hàng (VD: "ĐẾN DÃY A - LẤY 5 SẢN PHẨM").
  - Mở Camera để verify hàng. NẾU QUÉT SAI MÃ: Kích hoạt `Vibration.vibrate()` mạnh và nháy màn hình đỏ. Quét đúng mới hiện ô nhập số lượng và nút Trừ kho.
- **Handover (Bàn giao):** KHÔNG dùng nút bấm thường. Bắt buộc code một component "Swipe Button" (Trượt để xác nhận) để chống bấm nhầm trong túi quần.

## 10. QUY TẮC VỀ CODE STYLE & BEST PRACTICES
### 10.1. QUY CHUẨN GIAO TIẾP API (API RESPONSE FORMAT)
- **Backend:** BẮT BUỘC trả về mọi response theo một wrapper chuẩn: `{ "success": true/false, "message": "...", "data": ... }`.
- **Xử lý lỗi (Exception Handling):** BẮT BUỘC dùng Global Exception Handler Middleware. Không dùng try/catch lặp đi lặp lại ở từng Controller. Lỗi nghiệp vụ trả về HTTP 400, lỗi hệ thống trả về HTTP 500.

### 10.2. QUY CHUẨN ĐẶT TÊN (NAMING CONVENTIONS)
- **Interfaces:** Bắt buộc bắt đầu bằng chữ `I` (VD: `IInventoryRepository`, `IAiOcrService`).
- **DTOs:** Bắt buộc có hậu tố `Dto` hoặc `Request`/`Response` (VD: `CreateReceiptRequest`, `ProductDto`).
- **Use Cases/Services:** Nằm ở tầng Application, có hậu tố `Service` hoặc `UseCase`.

### 10.3. CHỈ THỊ SINH SƠ ĐỒ PLANTUML
- Khi được yêu cầu vẽ System Architecture: BẮT BUỘC dùng cú pháp Component Diagram của PlantUML, phân chia rõ các Node (Web, Mobile, Backend, Database).
- Khi vẽ Sequence Diagram (Luồng nghiệp vụ): BẮT BUỘC phải có `autonumber`, phân rõ ranh giới các hệ thống bằng thẻ `box`.

## 10.4. QUY TẮC VIẾT CODE BẮT BUỘC (SOLID, CLEAN ARCHITECTURE & C# BEST PRACTICES)
1. **Single Responsibility Principle (SRP):** - Controller (Tầng API) CHỈ làm nhiệm vụ tiếp nhận HTTP Request, gọi Service và trả về HTTP Response. TUYỆT ĐỐI KHÔNG viết logic nghiệp vụ (kiểm tra mật khẩu, tính toán, truy vấn DB trực tiếp) trong Controller.
2. **Dependency Inversion Principle (DIP):**
   - Tầng API chỉ được phép giao tiếp với Tầng Application thông qua Interfaces (ví dụ: `IAuthService`). 
   - Bắt buộc phải đăng ký Dependency Injection (Scoped/Transient) cho mọi Service trong `Program.cs`.
3. Hãy đảm bảo code tuân thủ Strict Nullable Reference Types của C# 10 (dùng ? cho biến có thể null và string.Empty cho chuỗi)

## 11. ĐẶC TẢ THỰC THỂ DỮ LIỆU (CORE ENTITIES & ERD - 14 BẢNG)
BẮT BUỘC sử dụng cấu trúc Entity cốt lõi sau đây khi tạo `DbContext` và Migrations. Mọi Entity giao dịch đều phải có `WarehouseId`.

**Nhóm Tài khoản & Phân quyền (RBAC):**
- **Role:** Danh sách quyền hạn. Cột: `Id`, `Name` (Admin, QA_QC, Staff), `Description`.
- **User:** Quản lý nhân sự. Cột: `Id`, `Username`, `PasswordHash`, `RoleId` (Khóa ngoại), `WarehouseId` (Nullable - Admin thì null, Staff/QA thì gắn chết vào 1 kho), `RefreshToken` (Lưu chuỗi token), `RefreshTokenExpiryTime` (Lưu ngày hết hạn).

**Nhóm Dữ liệu nền (Master Data):**
- **Warehouse:** Kho bãi. Cột: `Id`, `Name`, `Address`.
- **Zone:** Khu vực lưu trữ phẳng. Cột: `Id`, `WarehouseId`, `Name` (VD: Dãy A, Khu B).
- **Category:** Danh mục phân loại. Cột: `Id`, `Name`.
- **Product:** Danh mục hàng tĩnh. Cột: `Id`, `CategoryId` (Khóa ngoại), `SKU`, `Barcode`, `Name`.

**Nhóm Đối tác Vận hành:**
- **Supplier (Nhà cung cấp):** Phục vụ luồng Inbound. Cột: `Id`, `Name`, `ContactPerson`, `Phone`, `Address`.
- **Customer (Khách hàng/Đại lý):** Phục vụ luồng Outbound. Cột: `Id`, `Name`, `Phone`, `DeliveryAddress`.

**Nhóm Tồn kho & Lịch sử (Core):**
- **Inventory:** Tồn kho thực tế. Cột: `Id`, `WarehouseId`, `ZoneId`, `ProductId`, `Quantity`, `LastRestockedDate` (Dùng để tính FIFO).
- **InventoryTransaction (Thẻ kho):** Lưu log mọi biến động. Cột: `Id`, `ProductId`, `ZoneId`, `QuantityChange` (+ cho nhập, - cho xuất), `TransactionType` (INBOUND, OUTBOUND, ADJUST), `ReferenceId` (ID Phiếu), `CreatedAt`.

**Nhóm Nghiệp vụ Nhập/Xuất:**
- **Receipt (Phiếu Nhập):** Cột: `Id`, `WarehouseId`, `SupplierId` (Nullable), `CreatedBy`, `Status` (Enum: Draft, QC_Checked, Completed).
- **ReceiptDetail:** Cột: `Id`, `ReceiptId`, `ProductId`, `ZoneId` (Nơi cất), `ExpectedQuantity`, `ActualQuantity`.
- **Issue (Phiếu Xuất):** Cột: `Id`, `WarehouseId`, `CustomerId` (Nullable), `CreatedBy`, `Status` (Enum: Pending, Picking, Handover).
- **IssueDetail:** Cột: `Id`, `IssueId`, `ProductId`, `ZoneId` (Nơi nhặt), `QuantityToPick`, `PickedQuantity`.

## 12. BẢO MẬT VÀ PHÂN QUYỀN (RBAC RULES)
Khi code API Controller và Middleware, BẮT BUỘC tuân thủ luồng bảo mật sau:

- **JWT Claims:** Token sinh ra bắt buộc phải chứa 2 custom claims là `Role` và `WarehouseId` (nếu có).
- **Global Query Filter:** Tầng Infrastructure phải tự động bắt `WarehouseId` từ HTTP Context của User đang request để tự động gắn vào các câu query Entity Framework (cấm code tay `.Where` ở Controller).
- **Phân quyền API (Authorization):**
  - Admin: Được gọi mọi API `[Authorize(Roles = "Admin")]`.
  - QA/QC: Chỉ được gọi API OCR và xác nhận phiếu nhập `[Authorize(Roles = "QA_QC, Admin")]`.
  - Staff (Thủ kho): Chỉ được gọi API lấy danh sách lệnh, xác nhận cất/nhặt hàng `[Authorize(Roles = "Staff")]`.

## 13. HƯỚNG DẪN THUẬT TOÁN FIFO (FIRST-IN-FIRST-OUT)
Khi code Use Case `GeneratePickingPlanService` (Tạo lộ trình nhặt hàng cho Phiếu Xuất), Copilot BẮT BUỘC triển khai logic thuật toán chia mẻ (Split Allocation) như sau:

1. **Đầu vào:** Nhận vào danh sách `ProductId` và số lượng cần xuất (TotalNeeded).
2. **Truy vấn:** Tìm trong bảng `Inventory` các record có chứa `ProductId` này.
3. **Sắp xếp (Cốt lõi FIFO):** OrderBy `LastRestockedDate` ASC (Ngày cất hàng cũ nhất lên đầu).
4. **Trừ lùi:**
   - Nếu tồn kho ở Zone đầu tiên >= TotalNeeded: Trừ thẳng, kết thúc.
   - Nếu tồn kho ở Zone đầu tiên < TotalNeeded: Trừ cạn Zone đó, lấy phần thiếu tiếp tục trừ sang Zone có tuổi đời cũ thứ hai.
5. **Đầu ra:** Trả về một List các `IssueDetail` gợi ý cụ thể cho App Mobile: "Cần lấy 5 cái ở Zone A (hàng cũ), 2 cái ở Zone B (hàng mới)".