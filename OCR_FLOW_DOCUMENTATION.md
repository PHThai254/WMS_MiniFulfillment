# 📋 Luồng Upload Ảnh & OCR Gemini API - Hướng Dẫn Hoàn Chỉnh

## 📌 Tổng Quan Luồng

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. QA/QC Upload Ảnh Hóa Đơn                                     │
│    └─> File JPEG/PNG/GIF/WebP, max 5MB                         │
├─────────────────────────────────────────────────────────────────┤
│ 2. Frontend Gửi Base64 → Backend `/api/ocr/extract`            │
│    └─> Axios multipart/form-data                              │
├─────────────────────────────────────────────────────────────────┤
│ 3. Backend Call Gemini API (LLM Vision)                        │
│    └─> GeminiOcrService.ExtractInvoiceDataAsync()             │
│    └─> Prompt yêu cầu JSON + Confidence Scores                │
│    └─> Async/await, không block thread                        │
├─────────────────────────────────────────────────────────────────┤
│ 4. Parse JSON & Đánh Dấu Field Nghi Ngờ (< 70% confidence)   │
│    └─> OcrProcessingService.CalculateSuspiciousFields()       │
├─────────────────────────────────────────────────────────────────┤
│ 5. Trả Về ReceiptOcrDto → Frontend (Wrapper ApiResponse)       │
│    └─> { success: true, data: { supplierName, items[], ...} } │
├─────────────────────────────────────────────────────────────────┤
│ 6. Frontend Hiển Thị Split View (Ảnh + Form Duyệt)             │
│    └─> Viền đỏ cho field nghi ngờ                             │
│    └─> QA/QC có thể edit trước khi bấm "Duyệt & Lưu"          │
├─────────────────────────────────────────────────────────────────┤
│ 7. POST `/api/receipts/save-from-ocr` → Lưu Receipt            │
│    └─> SaveOcrReceiptRequest (supplierId, items[], notes)     │
│    └─> DB Transaction: Tạo Receipt + Update Inventory         │
│    └─> Status trực tiếp → Completed (đã duyệt)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Backend Components

### 1. **DTOs** (`WMS.Application/DTOs/`)

#### `ReceiptOcrDto.cs` - Kết Quả OCR
```csharp
public class ReceiptOcrDto
{
    public string? SupplierName { get; set; }
    public double? SupplierNameConfidence { get; set; }      // Độ tin cậy (0-1)
    public DateTime? InvoiceDate { get; set; }
    public double? InvoiceDateConfidence { get; set; }
    public List<OcrItemDto> Items { get; set; }             // Chi tiết hàng
    public List<string> SuspiciousFields { get; set; }      // Field mà confidence < 0.7
}

public class OcrItemDto
{
    public string? ProductName { get; set; }
    public double? ProductNameConfidence { get; set; }
    public int Quantity { get; set; }
    public double? QuantityConfidence { get; set; }
    public decimal UnitPrice { get; set; }
    public double? UnitPriceConfidence { get; set; }
}
```

#### `SaveOcrReceiptRequest.cs` - Request Lưu Receipt
```csharp
public class SaveOcrReceiptRequest
{
    public int SupplierId { get; set; }                      // Nhà cung cấp
    public DateTime InvoiceDate { get; set; }                // Ngày hóa đơn
    public List<SaveOcrReceiptItemRequest> Items { get; set; }
    public string? Notes { get; set; }                       // Ghi chú QA/QC
}

public class SaveOcrReceiptItemRequest
{
    public int ProductId { get; set; }
    public int ZoneId { get; set; }                          // Nơi cất hàng
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
```

### 2. **Services** (`WMS.Infrastructure/Services/`)

#### `GeminiOcrService.cs` - Gọi Gemini API
```csharp
public class GeminiOcrService : IAiOcrService
{
    public async Task<string> ExtractInvoiceDataAsync(string base64Image)
    {
        // 1. Build endpoint với API Key từ appsettings
        var endpoint = $"{baseUrl}/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";
        
        // 2. Craft prompt yêu cầu JSON + Confidence + Suspicious Fields
        var prompt = @"Extract data from invoice and return ONLY JSON with:
                      - supplierName + confidence
                      - invoiceDate + confidence
                      - items[] with productName, quantity, unitPrice + confidence
                      - suspiciousFields: fields with confidence < 0.7";
        
        // 3. Gửi Base64 ảnh + prompt
        var request = new { 
            contents = new[] { 
                new { parts = new[] { 
                    new { text = prompt },
                    new { inline_data = new { mime_type = "image/jpeg", data = base64Image } }
                }}
            },
            generationConfig = new { responseMimeType = "application/json", temperature = 0.2f }
        };
        
        // 4. Call async
        var response = await _httpClient.PostAsync(endpoint, content);
        
        // 5. Parse JSON từ response
        var text = root["candidates"][0]["content"]["parts"][0]["text"].GetString();
        return text;
    }
}
```

#### `OcrProcessingService.cs` - Parse & Mark Suspicious
```csharp
public class OcrProcessingService : IOcrProcessingService
{
    private const double SuspiciousConfidenceThreshold = 0.7;
    
    public async Task<ReceiptOcrDto> ProcessInvoiceImageAsync(string base64Image)
    {
        // 1. Gọi Gemini API
        string jsonResult = await _aiOcrService.ExtractInvoiceDataAsync(base64Image);
        
        // 2. Deserialize thành ReceiptOcrDto
        var result = JsonSerializer.Deserialize<ReceiptOcrDto>(jsonResult);
        
        // 3. Calculate suspiciousFields nếu AI chưa provide
        if (result.SuspiciousFields == null || result.SuspiciousFields.Count == 0)
        {
            result.SuspiciousFields = CalculateSuspiciousFields(result);
        }
        
        return result;
    }
    
    private List<string> CalculateSuspiciousFields(ReceiptOcrDto result)
    {
        var suspiciousFields = new List<string>();
        
        // Check top-level fields
        if (result.SupplierNameConfidence.HasValue && 
            result.SupplierNameConfidence.Value < SuspiciousConfidenceThreshold)
        {
            suspiciousFields.Add("supplierName");
        }
        
        // Check item fields
        foreach (var (item, index) in result.Items.Select((item, idx) => (item, idx)))
        {
            if (item.ProductNameConfidence < 0.7)
                suspiciousFields.Add($"items[{index}].productName");
            // ... check quantity, unitPrice
        }
        
        return suspiciousFields;
    }
}
```

#### `ReceiptService.cs` - SaveReceiptFromOcrAsync
```csharp
public async Task<int> SaveReceiptFromOcrAsync(SaveOcrReceiptRequest request, string createdBy)
{
    await using var tx = await _db.Database.BeginTransactionAsync();
    try
    {
        // 1. Validate supplier, products, zones exist
        
        // 2. Tạo Receipt mới
        var receipt = new Receipt
        {
            WarehouseId = warehouseId,
            SupplierId = request.SupplierId,
            Status = ReceiptStatus.QC_Checked,  // Đã duyệt
            CreatedBy = createdBy
        };
        
        // 3. Thêm ReceiptDetails từ request items
        foreach (var item in request.Items)
        {
            receipt.ReceiptDetails.Add(new ReceiptDetail
            {
                ProductId = item.ProductId,
                ZoneId = item.ZoneId,
                ActualQuantity = item.Quantity,
                UnitPrice = item.UnitPrice
            });
        }
        
        // 4. Cập nhật Inventory (cộng tồn kho)
        foreach (var item in request.Items)
        {
            var inventory = await _db.Inventories.FirstOrDefaultAsync(...);
            if (inventory == null)
            {
                _db.Inventories.Add(new Inventory { 
                    Quantity = item.Quantity,
                    LastRestockedDate = DateTime.UtcNow
                });
            }
            else
            {
                inventory.Quantity += item.Quantity;
            }
            
            // 5. Ghi log InventoryTransaction
            _db.InventoryTransactions.Add(new InventoryTransaction
            {
                QuantityChange = item.Quantity,
                TransactionType = "INBOUND",
                ReferenceId = receipt.Id
            });
        }
        
        // 6. Commit
        receipt.Status = ReceiptStatus.Completed;
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        
        return (int)receipt.Id.GetHashCode();
    }
    catch
    {
        await tx.RollbackAsync();
        throw;
    }
}
```

### 3. **Controller** (`WMS.API/Controllers/`)

#### `OcrController.cs`
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "QA_QC, Admin")]
public class OcrController : ControllerBase
{
    [HttpPost("extract")]
    public async Task<IActionResult> ExtractInvoice(IFormFile image)
    {
        // 1. Validate file (size, extension)
        if (image.Length > 5MB) return BadRequest(...);
        
        // 2. Convert to Base64
        using var memoryStream = new MemoryStream();
        await image.CopyToAsync(memoryStream);
        string base64String = Convert.ToBase64String(memoryStream.ToArray());
        
        // 3. Call OcrProcessingService
        var result = await _ocrProcessingService.ProcessInvoiceImageAsync(base64String);
        
        // 4. Return ApiResponse wrapper
        return Ok(new ApiResponse<object>(true, "Xử lý OCR thành công", result));
    }
}
```

#### `ReceiptsController.cs`
```csharp
[HttpPost("save-from-ocr")]
[Authorize(Roles = "QA_QC,Admin")]
public async Task<ActionResult> SaveFromOcr([FromBody] SaveOcrReceiptRequest request)
{
    var createdBy = _currentUser.GetCurrentUserId() ?? "system";
    var receiptId = await _service.SaveReceiptFromOcrAsync(request, createdBy);
    return Ok(new ApiResponse<object>(true, "Lưu phiếu nhập thành công", new { id = receiptId }));
}
```

### 4. **appsettings.json** - Cấu hình Gemini API
```json
{
  "Gemini": {
    "ApiKey": "YOUR_GEMINI_API_KEY",
    "BaseUrl": "https://generativelanguage.googleapis.com"
  }
}
```

**Cách lấy Gemini API Key:**
1. Vào [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key" → "Create API key"
3. Copy key, paste vào `appsettings.json`

---

## 🎨 Frontend Components

### 1. **OcrValidation.tsx** - Split View Component

**Layout:**
```
┌─────────────────────────┬────────────────────────────┐
│   LEFT PANEL            │    RIGHT PANEL             │
│ ┌─────────────────────┐ │ ┌──────────────────────┐   │
│ │ Upload Dragger      │ │ │ Form Duyệt OCR       │   │
│ │ (Kéo thả ảnh)      │ │ │                      │   │
│ └─────────────────────┘ │ │ Supplier [  ▼  ]   │   │
│ ┌─────────────────────┐ │ │ Invoice Date [  ]   │   │
│ │ [Xử lý OCR] Button │ │ │ ─────────────────   │   │
│ └─────────────────────┘ │ │ Items Table:       │   │
│ ┌─────────────────────┐ │ │ ┌─────────────────┐ │   │
│ │ Image Preview       │ │ │ │Sản phẩm │SL│Giá │ │   │
│ │ (Zoom / Pan)        │ │ │ │ ⚠️ Field nghi   │ │   │
│ │                     │ │ │ │ (Viền đỏ)   │ │   │
│ │                     │ │ │ └─────────────────┘ │   │
│ └─────────────────────┘ │ │ Notes: [          ] │   │
│                         │ │ ┌─────────┐┌──────┐ │   │
│                         │ │ │  Hủy   ││Duyệt&│ │   │
│                         │ │ └─────────┘└──────┘ │   │
│                         │ └──────────────────────┘   │
└─────────────────────────┴────────────────────────────┘
```

**Nhôm Chính:**
```typescript
interface OcrValidationProps {}

const OcrValidation: React.FC<OcrValidationProps> = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<RcFile | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [ocrData, setOcrData] = useState<ReceiptOcrDto | null>(null);
  const [items, setItems] = useState<(OcrItemDto & { key: string })[]>([]);
  
  // Load danh sách suppliers, products, zones
  const loadDataOptions = async () => {
    const [suppliersRes, productsRes, zonesRes] = await Promise.all([
      supplierService.getSuppliers(),
      productService.getProducts(),
      zoneService.getZones(),
    ]);
  };
  
  // Upload & Preview
  const handleUploadChange = (file: RcFile) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };
  
  // Call OCR API
  const handleExtractOcr = async () => {
    setLoading(true);
    try {
      const result = await ocrService.extractInvoiceFromImage(imageFile);
      setOcrData(result);
      setItems(result.items.map((item, idx) => ({ ...item, key: `item_${idx}` })));
    } catch (error) {
      message.error('Lỗi xử lý OCR');
    } finally {
      setLoading(false);
    }
  };
  
  // Check field suspicious
  const isSuspiciousField = (fieldName: string): boolean => {
    return ocrData?.suspiciousFields.includes(fieldName) || false;
  };
  
  // Table columns
  const columns: ColumnsType = [
    {
      title: 'Tên Sản phẩm',
      dataIndex: 'productName',
      render: (text, _, index) => (
        <span style={
          isItemFieldSuspicious(index, 'productName') 
            ? { borderBottom: '2px solid red' }  // 🔴 Viền đỏ nghi ngờ
            : {}
        }>
          {text}
        </span>
      ),
    },
    // ... Quantity, UnitPrice columns
  ];
  
  // Save Receipt sau khi duyệt
  const handleSaveReceipt = async () => {
    const values = await form.validateFields();
    
    const request: SaveOcrReceiptRequest = {
      supplierId: values.supplierId,
      invoiceDate: values.invoiceDate.format('YYYY-MM-DD'),
      items: items.map(item => ({
        productId: item.productId,
        zoneId: item.zoneId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      notes: values.notes,
    };
    
    await ocrService.saveReceiptFromOcr(request);
    message.success('Lưu phiếu nhập thành công!');
  };
};
```

### 2. **API Services** (`src/api/`)

#### `ocrService.ts`
```typescript
class OcrService {
  async extractInvoiceFromImage(imageFile: File): Promise<ReceiptOcrDto> {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await apiClient.post<ApiResponse<ReceiptOcrDto>>(
      '/api/ocr/extract',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    
    return response.data.data as ReceiptOcrDto;
  }
  
  async saveReceiptFromOcr(request: SaveOcrReceiptRequest): Promise<number> {
    const response = await apiClient.post(
      '/api/receipts/save-from-ocr',
      request
    );
    return response.data.data?.id || 0;
  }
}
```

#### `productService.ts`, `supplierService.ts`, `zoneService.ts`
- Tương tự, fetch từ `/api/products`, `/api/suppliers`, `/api/zones`

### 3. **Type Definitions** (`src/types/api.ts`)
```typescript
export interface ReceiptOcrDto {
  supplierName?: string;
  supplierNameConfidence?: number;
  invoiceDate?: string;
  invoiceDateConfidence?: number;
  items: OcrItemDto[];
  suspiciousFields: string[];
}

export interface OcrItemDto {
  productName?: string;
  productNameConfidence?: number;
  quantity: number;
  quantityConfidence?: number;
  unitPrice: number;
  unitPriceConfidence?: number;
}

export interface SaveOcrReceiptRequest {
  supplierId: number;
  invoiceDate: string;
  items: SaveOcrReceiptItemRequest[];
  notes?: string;
}
```

---

## 🧪 Testing & Validation

### 1. **Manual Testing Checklist**

```bash
# 1. Chuẩn bị
□ Update Gemini API Key vào appsettings.json
□ Chạy Backend: dotnet run (WMS.API)
□ Chạy Frontend: npm run dev (web-admin)

# 2. Test OCR Extraction
□ Vào http://localhost:5173/operations/ocr
□ Upload ảnh hóa đơn (JPEG/PNG, < 5MB)
□ Click "Xử lý OCR"
□ Kiểm tra kết quả:
  - Dữ liệu được extract đúng (SupplierName, InvoiceDate, Items)
  - SuspiciousFields được đánh dấu (confidence < 0.7)
  - Viền đỏ hiển thị cho field nghi ngờ

# 3. Test Form Editing & Validation
□ Sửa các field trong form
□ Thêm/xóa items
□ Chọn Supplier từ dropdown
□ Chọn Zones cho từng sản phẩm
□ Nhập ghi chú

# 4. Test Save Receipt
□ Bấm "Duyệt & Lưu"
□ Kiểm tra database:
  - Receipt được tạo với status = Completed
  - ReceiptDetails được insert với quantity từ OCR
  - Inventory được cập nhật (Quantity += OCR Quantity)
  - InventoryTransaction được ghi log

# 5. Test Error Handling
□ Upload file quá 5MB → Error
□ Upload file không phải ảnh → Error
□ Không chọn ảnh, click "Xử lý OCR" → Error
□ Lỗi Gemini API (key sai) → Error message từ Backend
```

### 2. **Database Validation**

```sql
-- Kiểm tra Receipt vừa tạo
SELECT * FROM Receipts 
WHERE CreatedBy = 'system' 
ORDER BY CreatedAt DESC LIMIT 1;

-- Kiểm tra ReceiptDetails
SELECT * FROM ReceiptDetails 
WHERE ReceiptId = (SELECT Id FROM Receipts ORDER BY CreatedAt DESC LIMIT 1);

-- Kiểm tra Inventory Update
SELECT * FROM Inventories 
WHERE LastRestockedDate > DATEADD(MINUTE, -5, GETUTCDATE());

-- Kiểm tra InventoryTransaction Log
SELECT * FROM InventoryTransactions 
WHERE TransactionType = 'INBOUND' 
ORDER BY CreatedAt DESC LIMIT 5;
```

### 3. **API Testing** (Swagger/Postman)

```bash
# 1. POST /api/ocr/extract
Content-Type: multipart/form-data
Body: image = <file.jpg>
Expected: { "success": true, "data": { "supplierName": "...", "items": [], "suspiciousFields": [] } }

# 2. POST /api/receipts/save-from-ocr
Content-Type: application/json
Authorization: Bearer <access_token>
Body: {
  "supplierId": 1,
  "invoiceDate": "2026-05-18",
  "items": [
    { "productId": 1, "zoneId": 1, "quantity": 100, "unitPrice": 50000 }
  ],
  "notes": "OCR OK"
}
Expected: { "success": true, "data": { "id": 123 } }

# 3. GET /api/receipts/{id}
Expected: Receipt vừa tạo với status = "Completed"
```

---

## 🔐 Security Notes

1. **Authentication**: Yêu cầu JWT Token (QA_QC hoặc Admin role)
2. **File Upload**: Validate file size (max 5MB) & extension (.jpg, .png, .gif, .webp)
3. **API Key**: Lưu Gemini API Key trong User Secrets, KHÔNG hardcode
4. **Data Validation**: Validate supplierId, productId, zoneId tồn tại trước lưu DB
5. **Transaction**: Sử dụng DB Transaction để rollback nếu lỗi

---

## 📝 File Changes Summary

### Backend Files Created/Modified:
```
✅ WMS.Application/DTOs/ReceiptOcrDto.cs (UPDATED)
✅ WMS.Application/DTOs/Operations/SaveOcrReceiptRequest.cs (CREATED)
✅ WMS.Application/Interfaces/IOperationServices.cs (UPDATED - thêm SaveReceiptFromOcrAsync)
✅ WMS.Application/Services/OcrProcessingService.cs (UPDATED)
✅ WMS.Infrastructure/Services/GeminiOcrService.cs (UPDATED - cải thiện prompt)
✅ WMS.Infrastructure/Services/Operations/OperationServices.cs (UPDATED - thêm SaveReceiptFromOcrAsync)
✅ WMS.API/Controllers/OcrController.cs (UPDATED - hoàn thiện)
✅ WMS.API/Controllers/OperationControllers.cs (UPDATED - thêm /save-from-ocr endpoint)
```

### Frontend Files Created/Modified:
```
✅ web-admin/src/api/ocrService.ts (CREATED)
✅ web-admin/src/api/productService.ts (CREATED)
✅ web-admin/src/api/supplierService.ts (CREATED)
✅ web-admin/src/api/zoneService.ts (CREATED)
✅ web-admin/src/api/endpoints.ts (UPDATED)
✅ web-admin/src/types/api.ts (UPDATED)
✅ web-admin/src/components/ocr/OcrValidation.tsx (CREATED)
✅ web-admin/src/pages/operations/OcrPage.tsx (CREATED)
```

---

## 🚀 Deployment Checklist

- [ ] Update Gemini API Key vào production appsettings
- [ ] Test OCR endpoint với production API Key
- [ ] Verify file upload validation works
- [ ] Test database transaction rollback scenarios
- [ ] Verify JWT token authorization works
- [ ] Load test: Gửi 10-20 requests OCR simultaneously
- [ ] Monitor error logs trong production

---

## 📚 References

- [Gemini API Docs](https://ai.google.dev/tutorials/rest_quickstart)
- [Ant Design Docs](https://ant.design/)
- [Entity Framework Core Transactions](https://learn.microsoft.com/en-us/ef/core/saving/transactions)
- [React + Axios](https://axios-http.com/)

---

**Tác giả:** Hệ thống WMS Mini Fulfillment
**Ngày cập nhật:** 2026-05-18
**Phiên bản:** 1.0
