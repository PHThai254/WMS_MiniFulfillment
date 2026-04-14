# 📋 Instruction.md — Hệ thống WMS Mini Fulfillment

> File này định nghĩa các quy tắc bắt buộc cho GitHub Copilot khi sinh code trong dự án WMS.
> Mọi đề xuất code phải tuân thủ nghiêm ngặt các quy tắc xử lý rủi ro và kiến trúc bên dưới.

---

## 1. Tổng quan dự án

| Thành phần | Công nghệ |
|---|---|
| Mobile App (Thủ kho) | React Native (Expo) + TypeScript |
| Web Admin (Quản lý) | ReactJS (Vite) + TypeScript |
| Backend API | .NET 10 Web API |
| Database | SQL Server + Entity Framework Core 10 |
| Kiến trúc | Clean Architecture + Monorepo |
| AI Services | OCR (Bóc tách hóa đơn) |

---

## 2. Kiến trúc bắt buộc — Clean Architecture

### 2.1 Quy tắc chung Backend (.NET)
- **Bắt buộc áp dụng Clean Architecture** cho toàn bộ Backend.
- Các project không được tham chiếu ngược. Chiều phụ thuộc: `API -> Infrastructure -> Application -> Domain`.
- [cite_start]Không bao giờ update DB trực tiếp từ Controller
- Tầng Domain chứa Entities cốt lõi. Tầng Application chứa logic nghiệp vụ (Services/Use Cases). Tầng Infrastructure chứa `ApplicationDbContext` và Repositories.

### 2.2 Cấu trúc Frontend (React/Expo)
- Tách biệt UI Components và logic gọi API (dùng Custom Hooks hoặc Axios Interceptors).
- Quản lý state tập trung cho các luồng nghiệp vụ phức tạp.

---

## 3. Quy tắc Backend (Bắt buộc tuân thủ 100%)

### 3.1 Trái tim của hệ thống: Inventory
- Hiểu đúng bản chất: Tồn kho (Inventory) không nằm trong bảng Products. `Inventory = Product + Location + Quantity`
- Mọi luồng Import/Export bắt buộc phải đi qua các bảng Detail (Ví dụ: `ReceiptDetail`, `IssueDetail`)
- Khi Import: Phải cộng tồn kho. Khi Export: Bắt buộc check tồn kho trước, sau đó mới trừ tồn kho.Mọi logic này phải nằm trong Service layer

### 3.2 Chống Xung đột dữ liệu (Race Condition)
- Đây là rủi ro nguy hiểm nhất khi nhiều thủ kho cùng xuất/nhập một mặt hàng
- **Bắt buộc** sử dụng cơ chế `Concurrency Token` trong Entity Framework Core, hoặc sử dụng Database Transaction kết hợp Isolation Level (`Repeatable Read`) tại API Xuất/Nhập kho

### 3.3 Quản lý Transaction & Performance
- Bắt buộc dùng Transaction khi lưu phiếu Nhập/Xuất: Thành công tất cả thì `commit`, lỗi 1 bước thì `rollback`.
- Tránh lỗi N+1 Query: Luôn sử dụng `.Include()` một cách chủ đích khi cần lấy dữ liệu quan hệ.
- Bổ sung `.AsNoTracking()` cho tất cả các API dạng GET danh sách (không sửa dữ liệu) để tối ưu RAM.

### 3.4 Bảo mật API
- CORS: Backend (.NET) phải cấu hình `AddCors` rõ ràng trong `Program.cs`, cấp phép cho Web Admin (VD: `http://localhost:5173`) và Mobile App.
- JWT Secret Key tuyệt đối không để trong `appsettings.json` rồi push lên public.Phải dùng file `.env` hoặc `appsettings.Development.json` đã được đưa vào `.gitignore`.
- Phân quyền bảo vệ dữ liệu phải nằm ở API Backend (kiểm tra Role qua JWT token), không chỉ ẩn UI ở Frontend.

---

## 4. Quy tắc Mobile App & Web Frontend

### 4.1 Mobile App (Xử lý thiết bị & Barcode)
- **Double Scan:** Phải áp dụng kỹ thuật Debounce (ngừng nhận tín hiệu mới trong 1-2 giây sau khi quét thành công) và đổi màu UI để chống gọi API trừ kho nhiều lần.
- **Offline Data Loss:** Triển khai "Offline Mode" cơ bản. Khi thao tác, lưu tạm trạng thái nháp vào `AsyncStorage`.Nếu mất mạng khi gọi API, hiện thông báo lưu nháp thay vì xóa trắng form.
- **Camera:** Xử lý triệt để luồng xin quyền truy cập Camera, bắt lỗi từ chối quyền và hướng dẫn mở cài đặt.

### 4.2 Web Admin
- Token (Access/Refresh) phải được quản lý an toàn, xử lý tự động refresh token bằng Axios Interceptors khi hết hạn (HTTP 401).

---

## 5. Quy tắc xử lý AI OCR

- **Chống Hallucination:** Bắt buộc có luồng validate (kiểm tra) cấu trúc JSON từ AI trả về trên Backend trước khi nạp vào form
- AI Prompt phải yêu cầu trả về cờ `isUncertain: true` nếu ảnh mờ.Bắt buộc phải có bước con người duyệt lại (Human in the loop) trước khi lưu.
- **Rate Limiting:** Code cơ chế Retry trên Backend khi gọi API AI bị lỗi 429.Mobile/Web phải hiển thị trạng thái "AI đang bận xử lý..."

---

## 6. Những điều AI KHÔNG được tự ý làm

- ❌ Tự ý code logic trừ tồn kho (Inventory) trực tiếp bằng SQL thuần trong Controller.
- ❌ Cập nhật số lượng thẳng vào bảng `Products` thay vì bảng `Inventory`.
- ❌ Quên sử dụng `Transaction` khi lưu các master-detail records (như Phiếu nhập/chi tiết phiếu)
- ❌ Viết API Get List mà không dùng `.AsNoTracking()`.
- ❌ Tự ý mở rộng Scope dự án sang các tính năng OMS, Shipping, Order Syncing ngoài phạm vi WMS in-house.