# Backend API Structure - WMS MiniFulfillment

## Tổng Quan
Backend sử dụng **Clean Architecture 4 tầng** với **RESTful API** pattern. Tất cả response được wrap trong một `ApiResponse<T>` wrapper chuẩn.

---

## 📋 CẤU TRÚC API RESPONSE CỐI LÕI

```csharp
{
  "success": true/false,
  "message": "Mô tả kết quả",
  "data": <object hoặc null>
}
```

**HTTP Status Codes:**
- `200 OK` - Thành công
- `400 Bad Request` - Lỗi nghiệp vụ (dữ liệu không hợp lệ)
- `401 Unauthorized` - Token không hợp lệ hoặc hết hạn
- `403 Forbidden` - Không có quyền (phân quyền không hợp lệ)
- `404 Not Found` - Resource không tìm thấy
- `409 Conflict` - Xung đột dữ liệu (concurrency)
- `500 Internal Server Error` - Lỗi hệ thống

---

## 🔐 AUTH CONTROLLER - `/api/Auth`

### 1. POST `/api/Auth/login`
**Mô tả:** Đăng nhập và nhận cặp Access Token / Refresh Token

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "string (lưu vào localStorage)",
    "user": {
      "id": "Guid",
      "username": "string",
      "role": "Admin|QA_QC|Staff",
      "warehouseId": "Guid",
      "warehouseName": "string",
      "permissions": ["run_ocr", "create_receipt", "approve_qc", ...]
    }
  }
}
```

**Phân quyền:** Không cần (Public endpoint)
**Thời hạn Token:**
- Access Token: 15-30 phút
- Refresh Token: 7 ngày (lưu vào DB)

---

### 2. POST `/api/Auth/refresh-token`
**Mô tả:** Cấp lại Access Token mới khi Access Token hết hạn

**Request:**
```json
{
  "accessToken": "string (hết hạn)",
  "refreshToken": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Làm mới token thành công",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs... (mới)",
    "refreshToken": "string (có thể mới hoặc cũ)"
  }
}
```

**Phân quyền:** Không cần

---

### 3. GET `/api/Auth/me`
**Mô tả:** Lấy thông tin user hiện tại từ JWT Token

**Request Headers:** `Authorization: Bearer <accessToken>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "Guid",
    "username": "string",
    "role": "Admin|QA_QC|Staff",
    "warehouseId": "Guid",
    "warehouseName": "string",
    "permissions": ["run_ocr", "create_receipt", ...]
  }
}
```

**Phân quyền:** `[Authorize]` - Cần token hợp lệ

---

## 🏭 MASTER DATA CONTROLLERS - `/api/Warehouses`, `/api/Zones`, `/api/Categories`, `/api/Products`

### 📦 WAREHOUSES - `/api/Warehouses`

#### GET `/api/Warehouses`
**Mô tả:** Lấy danh sách tất cả kho
**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "Guid",
      "name": "string",
      "location": "string",
      "zoneCount": 5
    }
  ]
}
```

#### GET `/api/Warehouses/{id}`
**Mô tả:** Lấy chi tiết 1 kho

#### POST `/api/Warehouses`
**Mô tả:** Tạo kho mới
**Request:**
```json
{
  "name": "string",
  "location": "string"
}
```
**Phân quyền:** `[Authorize(Policy = "manage_warehouses")]`

#### PUT `/api/Warehouses/{id}`
**Mô tả:** Cập nhật thông tin kho
**Phân quyền:** `[Authorize(Policy = "manage_warehouses")]`

#### DELETE `/api/Warehouses/{id}`
**Phân quyền:** `[Authorize(Policy = "manage_warehouses")]`

---

### 🗂️ ZONES - `/api/Zones`

#### GET `/api/Zones?warehouseId={warehouseId}`
**Mô tả:** Lấy danh sách zones trong 1 kho
**Query Parameters:**
- `warehouseId` (optional): Guid - Lọc theo kho

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "Guid",
      "warehouseId": "Guid",
      "warehouseName": "string",
      "name": "string"
    }
  ]
}
```

#### POST `/api/Zones`
**Request:**
```json
{
  "warehouseId": "Guid",
  "name": "string"
}
```
**Phân quyền:** `[Authorize(Policy = "manage_zones")]`

#### PUT `/api/Zones/{id}`
#### DELETE `/api/Zones/{id}`
**Phân quyền:** `[Authorize(Policy = "manage_zones")]`

---

### 🏷️ CATEGORIES - `/api/Categories`

#### GET `/api/Categories`
**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "Guid",
      "name": "string",
      "productCount": 10
    }
  ]
}
```

#### POST `/api/Categories`
**Request:**
```json
{
  "name": "string"
}
```
**Phân quyền:** `[Authorize(Policy = "manage_categories")]`

#### PUT, DELETE: `[Authorize(Policy = "manage_categories")]`

---

### 📝 PRODUCTS - `/api/Products`

#### GET `/api/Products?search={search}&categoryId={categoryId}`
**Query Parameters:**
- `search` (optional): string - Tìm kiếm theo tên/SKU/Barcode
- `categoryId` (optional): Guid - Lọc theo danh mục

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "Guid",
      "sku": "string",
      "barcode": "string",
      "name": "string",
      "price": 50000,
      "categoryId": "Guid",
      "categoryName": "string",
      "imagePath": "string (optional)"
    }
  ]
}
```

#### GET `/api/Products/{id}`
**Response:** ProductDto

#### GET `/api/Products/barcode/{barcode}`
**Mô tả:** Tìm sản phẩm bằng mã barcode (dùng cho máy quét mobile)
**Response:** ProductDto hoặc 404 NotFound

#### POST `/api/Products`
**Request:**
```json
{
  "name": "string (required)",
  "sku": "string (optional)",
  "price": 50000,
  "categoryId": "Guid"
}
```
**Phân quyền:** `[Authorize(Policy = "manage_products")]`

#### PUT `/api/Products/{id}`
#### DELETE `/api/Products/{id}`
**Phân quyền:** `[Authorize(Policy = "manage_products")]`

#### POST `/api/Products/{id}/image`
**Mô tả:** Upload ảnh cho sản phẩm
**Phân quyền:** `[Authorize(Policy = "manage_products")]`

---

## 🎯 OCR CONTROLLER - `/api/Ocr`

### POST `/api/Ocr/extract`
**Mô tả:** Upload ảnh hóa đơn và xử lý OCR qua Gemini API

**Request:** 
- `Form Data`: File ảnh (JPEG, PNG, GIF, WebP), tối đa 5MB

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Xử lý OCR thành công",
  "data": {
    "supplierName": "string",
    "supplierNameConfidence": 0.95,
    "invoiceDate": "2024-01-01T00:00:00",
    "invoiceDateConfidence": 0.89,
    "items": [
      {
        "productName": "Sản phẩm A",
        "productNameConfidence": 0.85,
        "quantity": 100,
        "quantityConfidence": 0.92,
        "unitPrice": 50000,
        "unitPriceConfidence": 0.88
      }
    ],
    "suspiciousFields": ["productName", "quantity"]  // Fields có confidence < 0.7
  }
}
```

**Response (400 Bad Request):**
- File không hợp lệ hoặc quá lớn

**Response (500 Internal Server Error):**
- Lỗi gọi Gemini API

**Phân quyền:** `[Authorize(Policy = "run_ocr")]`

---

## 📥 RECEIPTS CONTROLLER - `/api/Receipts`

### GET `/api/Receipts`
**Mô tả:** Lấy danh sách phiếu nhập

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "Guid",
      "warehouseId": "Guid",
      "warehouseName": "string",
      "supplierId": "Guid",
      "supplierName": "string",
      "createdByUserId": "Guid",
      "createdByUsername": "string",
      "status": "Draft|QC_Checked|Completed",
      "createdAt": "2024-01-01T00:00:00",
      "receiptDetails": [
        {
          "id": "Guid",
          "receiptId": "Guid",
          "productId": "Guid",
          "productName": "string",
          "productBarcode": "string",
          "zoneId": "Guid",
          "zoneName": "string",
          "expectedQuantity": 100,
          "actualQuantity": 95,
          "unitPrice": 50000
        }
      ]
    }
  ]
}
```

---

### GET `/api/Receipts/{id}`
**Mô tả:** Lấy chi tiết phiếu nhập

---

### POST `/api/Receipts`
**Mô tả:** Tạo phiếu nhập mới (Admin hoặc Planning staff)

**Request:**
```json
{
  "warehouseId": "Guid",
  "supplierId": "Guid (optional)",
  "details": [
    {
      "productId": "Guid",
      "expectedQuantity": 100,
      "unitPrice": 50000
    }
  ]
}
```

**Response (200 OK):** ReceiptDto

**Phân quyền:** `[Authorize(Policy = "create_receipt")]`

---

### POST `/api/Receipts/{id}/approve-qc`
**Mô tả:** QA/QC kiểm tra và phê duyệt phiếu nhập (cập nhật số lượng thực tế)

**Request:**
```json
{
  "details": [
    {
      "detailId": "Guid",
      "actualQuantity": 95,
      "zoneId": "Guid"
    }
  ]
}
```

**Response (200 OK):** ReceiptDto với status = "QC_Checked"

**Phân quyền:** `[Authorize(Policy = "approve_qc_receipt")]`

---

### POST `/api/Receipts/{id}/approve-ocr`
**Mô tả:** Lưu phiếu nhập sau khi OCR (QA/QC duyệt kết quả AI)

**Request:**
```json
{
  "details": [
    {
      "productId": "Guid",
      "actualQuantity": 100,
      "unitPrice": 50000,
      "zoneId": "Guid"
    }
  ]
}
```

**Response (200 OK):** ReceiptDto

**Phân quyền:** `[Authorize(Policy = "approve_ocr_receipt")]`

---

### POST `/api/Receipts/{id}/complete-putaway`
**Mô tả:** Hoàn thành cất hàng (cộng tồn kho vào Inventory)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Hoàn thành cất hàng. Tồn kho đã được cập nhật.",
  "data": { ... ReceiptDto ... }
}
```

**Response (409 Conflict):**
- Tồn kho bị thay đổi bởi người dùng khác (concurrency error)

**Phân quyền:** `[Authorize(Policy = "complete_putaway")]`

---

### POST `/api/Receipts/save-from-ocr`
**Mô tả:** Lưu phiếu nhập sau khi QA/QC duyệt/sửa dữ liệu OCR

**Request:**
```json
{
  "supplierId": "Guid",
  "invoiceDate": "2024-01-01T00:00:00",
  "items": [
    {
      "productId": "Guid",
      "zoneId": "Guid",
      "expectedQuantity": 100,
      "actualQuantity": 95,
      "unitPrice": 50000
    }
  ],
  "notes": "string (optional)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Lưu phiếu nhập từ OCR thành công",
  "data": { "id": "Guid" }
}
```

**Phân quyền:** `[Authorize(Policy = "approve_qc")]`

---

### POST `/api/Receipts/{id}/check-completion`
**Mô tả:** Kiểm tra và tự động chuyển Receipt sang Completed nếu đủ hàng

**Response (200 OK):**
```json
{
  "success": true,
  "data": { "completed": true },
  "message": "Phiếu nhập đã chuyển sang Completed."
}
```

**Phân quyền:** `[Authorize(Policy = "complete_putaway")]`

---

## 📤 ISSUES CONTROLLER - `/api/Issues` (Phiếu Xuất - Nhặt hàng)

### GET `/api/Issues`
**Mô tả:** Lấy danh sách phiếu xuất

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "Guid",
      "warehouseId": "Guid",
      "warehouseName": "string",
      "customerId": "Guid",
      "customerName": "string",
      "createdByUserId": "Guid",
      "createdByUsername": "string",
      "status": "Pending|Picking|Handover",
      "createdAt": "2024-01-01T00:00:00",
      "issueDetails": [
        {
          "id": "Guid",
          "issueId": "Guid",
          "productId": "Guid",
          "productName": "string",
          "productBarcode": "string",
          "zoneId": "Guid",
          "zoneName": "string",
          "quantityToPick": 100,
          "pickedQuantity": 50
        }
      ]
    }
  ]
}
```

---

### GET `/api/Issues/{id}`
**Mô tả:** Lấy chi tiết phiếu xuất

---

### POST `/api/Issues`
**Mô tả:** Tạo phiếu xuất mới (tạo lệnh nhặt hàng)

**Request:**
```json
{
  "warehouseId": "Guid",
  "customerId": "Guid (optional)",
  "details": [
    {
      "productId": "Guid",
      "quantityToPick": 100
    }
  ]
}
```

**Response (200 OK):** IssueDto

**Phân quyền:** `[Authorize(Policy = "create_issue")]`

---

### GET `/api/Issues/{id}/picking-plan`
**Mô tả:** Tạo lộ trình nhặt hàng theo thuật toán FIFO (Picking Plan)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Lộ trình nhặt hàng FIFO đã được tạo.",
  "data": {
    "issueId": "Guid",
    "items": [
      {
        "issueDetailId": "Guid",
        "productId": "Guid",
        "productName": "string",
        "productBarcode": "string",
        "zoneId": "Guid",
        "zoneName": "string",
        "quantityToPick": 100,
        "restockedDate": "2023-12-01T00:00:00"  // Ngày cất hàng (dùng cho FIFO)
      }
    ]
  }
}
```

**Phân quyền:** `[Authorize(Policy = "get_picking_plan")]`

**📌 FIFO Logic:**
1. Truy vấn Inventory theo ProductId
2. Sắp xếp theo `LastRestockedDate` ASC (hàng cũ lên đầu)
3. Chia mẻ: Lấy cạn từng Zone, chuyển sang Zone tiếp theo nếu còn thiếu

---

### POST `/api/Issues/{id}/confirm-pick`
**Mô tả:** Xác nhận nhặt hàng từ 1 vị trí (Mobile app gọi)

**Request:**
```json
{
  "issueDetailId": "Guid",
  "pickedQuantity": 50
}
```

**Response (200 OK):** IssueDto với `pickedQuantity` được cập nhật

**Response (409 Conflict):**
- Tồn kho bị thay đổi bởi người dùng khác

**Phân quyền:** `[Authorize(Policy = "confirm_pick")]`

---

### POST `/api/Issues/{id}/handover`
**Mô tả:** Bàn giao vận chuyển (chuyển phiếu sang trạng thái Handover)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bàn giao vận chuyển thành công.",
  "data": { ... IssueDto ... }
}
```

**Response (409 Conflict):**
- Dữ liệu tồn kho hoặc phiếu đã bị thay đổi bởi người khác

**Phân quyền:** `[Authorize(Policy = "handover_issue")]`

---

### POST `/api/Issues/{id}/check-completion`
**Mô tả:** Kiểm tra và tự động chuyển Issue sang Handover nếu tất cả hàng đã pick đủ

**Response (200 OK):**
```json
{
  "success": true,
  "data": { "completed": true },
  "message": "Phiếu xuất đã chuyển sang Handover."
}
```

**Phân quyền:** `[Authorize(Policy = "confirm_pick")]`

---

## 📊 INVENTORY CONTROLLER - `/api/Inventory`

### GET `/api/Inventory?pageIndex=1&pageSize=20&warehouseId={warehouseId}&zoneId={zoneId}`
**Mô tả:** Lấy danh sách tồn kho (có phân trang)

**Query Parameters:**
- `pageIndex`: int (default: 1)
- `pageSize`: int (default: 20)
- `warehouseId` (optional): Guid
- `zoneId` (optional): Guid

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pageIndex": 1,
    "pageSize": 20,
    "totalCount": 500,
    "items": [
      {
        "id": "Guid",
        "warehouseId": "Guid",
        "warehouseName": "string",
        "zoneId": "Guid",
        "zoneName": "string",
        "productId": "Guid",
        "productName": "string",
        "productBarcode": "string",
        "productSKU": "string",
        "productPrice": 50000,
        "quantity": 150,
        "lastRestockedDate": "2024-01-01T00:00:00"
      }
    ]
  }
}
```

---

### GET `/api/Inventory/stock-summary`
**Mô tả:** Lấy tổng hợp tồn kho theo sản phẩm (groupby Product)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "productId": "Guid",
      "productName": "string",
      "productBarcode": "string",
      "productSKU": "string",
      "productPrice": 50000,
      "totalQuantity": 500,
      "stockByZone": [
        {
          "zoneId": "Guid",
          "zoneName": "string",
          "quantity": 150,
          "lastRestockedDate": "2024-01-01T00:00:00"
        }
      ]
    }
  ]
}
```

---

### GET `/api/Inventory/transactions?pageIndex=1&pageSize=50`
**Mô tả:** Lấy lịch sử giao dịch tồn kho

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pageIndex": 1,
    "pageSize": 50,
    "totalCount": 1000,
    "items": [
      {
        "id": "Guid",
        "productId": "Guid",
        "productName": "string",
        "zoneId": "Guid",
        "zoneName": "string",
        "quantityChange": 100,  // + hoặc -
        "transactionType": "INBOUND|OUTBOUND|ADJUST",
        "referenceId": "Guid",  // ID Receipt hoặc Issue
        "createdAt": "2024-01-01T00:00:00"
      }
    ]
  }
}
```

---

## 🎁 CUSTOMER & SUPPLIER CONTROLLERS

### GET `/api/Customers`
### POST `/api/Customers`
### PUT `/api/Customers/{id}`
### DELETE `/api/Customers/{id}`

**CustomerDto:**
```json
{
  "id": "Guid",
  "name": "string",
  "phone": "string",
  "deliveryAddress": "string"
}
```

---

### GET `/api/Suppliers`
### POST `/api/Suppliers`
### PUT `/api/Suppliers/{id}`
### DELETE `/api/Suppliers/{id}`

**SupplierDto:**
```json
{
  "id": "Guid",
  "name": "string",
  "contactPerson": "string",
  "phone": "string",
  "address": "string"
}
```

---

## 📍 DTO CHÍNH CỦA HỆ THỐNG

### ReceiptDto (Phiếu Nhập)
```csharp
{
  "id": Guid,
  "warehouseId": Guid,
  "warehouseName": string,
  "supplierId": Guid?,
  "supplierName": string?,
  "createdByUserId": Guid,
  "createdByUsername": string?,
  "status": "Draft|QC_Checked|Completed",
  "createdAt": DateTime,
  "receiptDetails": [ReceiptDetailDto]
}
```

### ReceiptDetailDto
```csharp
{
  "id": Guid,
  "receiptId": Guid,
  "productId": Guid,
  "productName": string,
  "productBarcode": string,
  "zoneId": Guid?,
  "zoneName": string?,
  "expectedQuantity": int,
  "actualQuantity": int,
  "unitPrice": decimal
}
```

### IssueDto (Phiếu Xuất)
```csharp
{
  "id": Guid,
  "warehouseId": Guid,
  "warehouseName": string,
  "customerId": Guid?,
  "customerName": string?,
  "createdByUserId": Guid,
  "createdByUsername": string?,
  "status": "Pending|Picking|Handover",
  "createdAt": DateTime,
  "issueDetails": [IssueDetailDto]
}
```

### IssueDetailDto
```csharp
{
  "id": Guid,
  "issueId": Guid,
  "productId": Guid,
  "productName": string,
  "productBarcode": string,
  "zoneId": Guid?,
  "zoneName": string?,
  "quantityToPick": int,
  "pickedQuantity": int
}
```

### InventoryDto (Tồn Kho)
```csharp
{
  "id": Guid,
  "warehouseId": Guid,
  "warehouseName": string,
  "zoneId": Guid,
  "zoneName": string,
  "productId": Guid,
  "productName": string,
  "productBarcode": string,
  "productSKU": string,
  "productPrice": decimal,
  "quantity": int,
  "lastRestockedDate": DateTime
}
```

### PickingPlanDto (Kế Hoạch Nhặt Hàng FIFO)
```csharp
{
  "issueId": Guid,
  "items": [
    {
      "issueDetailId": Guid,
      "productId": Guid,
      "productName": string,
      "productBarcode": string,
      "zoneId": Guid,
      "zoneName": string,
      "quantityToPick": int,
      "restockedDate": DateTime  // Ngày cất hàng (FIFO)
    }
  ]
}
```

### ProductDto
```csharp
{
  "id": Guid,
  "sku": string,
  "barcode": string,
  "name": string,
  "price": decimal,
  "categoryId": Guid,
  "categoryName": string,
  "imagePath": string?
}
```

### ReceiptOcrDto (Kết Quả OCR)
```csharp
{
  "supplierName": string?,
  "supplierNameConfidence": double?,
  "invoiceDate": DateTime?,
  "invoiceDateConfidence": double?,
  "items": [
    {
      "productName": string?,
      "productNameConfidence": double?,
      "quantity": int,
      "quantityConfidence": double?,
      "unitPrice": decimal,
      "unitPriceConfidence": double?
    }
  ],
  "suspiciousFields": [string]  // Fields có confidence < 0.7
}
```

---

## 🔒 PHÂN QUYỀN (RBAC POLICIES)

**Danh sách Policies:**

| Policy | Mô Tả | Roles |
|--------|------|-------|
| `manage_warehouses` | Tạo/Sửa/Xóa kho | Admin |
| `manage_zones` | Tạo/Sửa/Xóa zone | Admin |
| `manage_categories` | Tạo/Sửa/Xóa danh mục | Admin |
| `manage_products` | Tạo/Sửa/Xóa sản phẩm | Admin |
| `create_receipt` | Tạo phiếu nhập | Admin, Planning |
| `approve_qc_receipt` | Phê duyệt phiếu nhập (QC kiểm tra) | QA_QC |
| `approve_ocr_receipt` | Phê duyệt phiếu nhập từ OCR | QA_QC |
| `approve_qc` | Duyệt kết quả QA/QC | QA_QC, Admin |
| `complete_putaway` | Hoàn thành cất hàng | Staff, Admin |
| `run_ocr` | Chạy OCR Gemini | QA_QC |
| `create_issue` | Tạo phiếu xuất | Admin, Planning |
| `get_picking_plan` | Lấy kế hoạch nhặt hàng FIFO | Staff, Mobile App |
| `confirm_pick` | Xác nhận nhặt hàng | Staff, Mobile App |
| `handover_issue` | Bàn giao vận chuyển | Staff, Admin |

---

## 🎯 PUT-AWAY WORKFLOW (Cất Hàng) - Dữ Liệu Cần Thiết

### Bước 1: Tạo phiếu nhập
```
POST /api/Receipts
{
  "warehouseId": Guid,
  "supplierId": Guid?,
  "details": [
    {
      "productId": Guid,
      "expectedQuantity": 100,
      "unitPrice": 50000
    }
  ]
}
→ Response: ReceiptDto (status: Draft)
```

### Bước 2: QA/QC kiểm tra và cấp nhật số lượng thực tế
```
POST /api/Receipts/{id}/approve-qc
{
  "details": [
    {
      "detailId": Guid,
      "actualQuantity": 95,
      "zoneId": Guid  // ← Nơi cần cất hàng
    }
  ]
}
→ Response: ReceiptDto (status: QC_Checked)
```

### Bước 3: Hoàn thành cất hàng (cộng tồn kho)
```
POST /api/Receipts/{id}/complete-putaway
→ Response: ReceiptDto (status: Completed)
→ Tồn kho (Inventory) được tự động cập nhật
```

### Dữ liệu cần truyền đến Mobile:
- **ReceiptDetailDto** chứa: ProductName, ProductBarcode, ZoneName, ExpectedQuantity, ActualQuantity
- Mobile quét barcode để xác minh sản phẩm
- Mobile nhập số lượng thực tế và zone (nếu cần thay đổi)

---

## 📍 PICKING WORKFLOW (Nhặt Hàng) - Dữ Liệu Cần Thiết

### Bước 1: Tạo phiếu xuất
```
POST /api/Issues
{
  "warehouseId": Guid,
  "customerId": Guid?,
  "details": [
    {
      "productId": Guid,
      "quantityToPick": 100
    }
  ]
}
→ Response: IssueDto (status: Pending)
```

### Bước 2: Lấy kế hoạch nhặt hàng FIFO
```
GET /api/Issues/{id}/picking-plan
→ Response: PickingPlanDto
  {
    "items": [
      {
        "issueDetailId": Guid,
        "productBarcode": "ABC123",
        "zoneName": "Dãy A",
        "quantityToPick": 50,
        "restockedDate": "2023-12-01"  // ← FIFO sorting
      },
      {
        "issueDetailId": Guid,
        "productBarcode": "ABC123",
        "zoneName": "Dãy B",
        "quantityToPick": 50,
        "restockedDate": "2023-12-15"
      }
    ]
  }
```

### Bước 3: Mobile quét và xác nhận nhặt hàng
```
POST /api/Issues/{id}/confirm-pick
{
  "issueDetailId": Guid,
  "pickedQuantity": 50
}
→ Response: IssueDto (pickedQuantity cập nhật)
→ Tồn kho (Inventory) được tự động trừ
```

### Bước 4: Bàn giao vận chuyển
```
POST /api/Issues/{id}/handover
→ Response: IssueDto (status: Handover)
```

### Dữ liệu cần truyền đến Mobile:
- **PickingPlanDto**: Hướng dẫn nhặt hàng theo FIFO (Zone, ProductBarcode, Quantity)
- **IssueDetailDto**: Chi tiết phiếu xuất (ProductBarcode, QuantityToPick, PickedQuantity)
- Mobile quét barcode để xác minh sản phẩm
- Mobile nhập số lượng thực tế nhặt được

---

## 🔄 GLOBAL QUERY FILTER

**Tất cả query sẽ tự động filter theo `WarehouseId` của User:**
- Phiếu Receipts
- Phiếu Issues
- Tồn kho Inventory
- Lịch sử InventoryTransactions

**WarehouseId được lấy từ JWT Token của User đang request.**

---

## 📌 CONCURRENCY HANDLING

**Các endpoint liên quan đến tồn kho sử dụng:**
- `DbUpdateConcurrencyException` bắt lỗi khi tồn kho bị thay đổi bởi người dùng khác
- Trả về HTTP 409 Conflict
- Client cần tải lại dữ liệu và thử lại

**Endpoints:**
- `POST /api/Receipts/{id}/complete-putaway`
- `POST /api/Issues/{id}/confirm-pick`
- `POST /api/Issues/{id}/handover`

