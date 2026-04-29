# Global Query Filter - WarehouseId Filtering Documentation

## 📋 Tổng Quan

Hệ thống WMS Mini Fulfillment sử dụng **Global Query Filter** để tự động lọc dữ liệu theo `WarehouseId` của người dùng hiện tại. Điều này đảm bảo rằng mỗi user chỉ có thể truy cập dữ liệu thuộc về Kho được gán cho họ.

---

## 🔑 Cách Thức Hoạt Động

### 1. **JWT Token chứa WarehouseId Claim**

Khi user đăng nhập thành công, `AuthService` sẽ sinh JWT Access Token chứa claim `WarehouseId`:

```csharp
// Trong AuthService.GenerateAccessToken()
if (user.WarehouseId.HasValue)
{
    claims.Add(new Claim("WarehouseId", user.WarehouseId.ToString()!));
}
```

**Ví dụ JWT Token Payload:**
```json
{
  "nameid": "user-id-123",
  "unique_name": "staff_warehouse_1",
  "role": "Staff",
  "WarehouseId": "warehouse-id-456",
  "exp": 1234567890
}
```

### 2. **ICurrentUserContext lấy WarehouseId từ Token**

Lớp `CurrentUserContext` (Implementation của `ICurrentUserContext`) giải mã JWT Token và trích xuất custom claim `WarehouseId`:

```csharp
public Guid? GetCurrentWarehouseId()
{
    var warehouseIdClaim = _httpContextAccessor.HttpContext?.User
        .FindFirst("WarehouseId")?.Value;
    
    if (string.IsNullOrEmpty(warehouseIdClaim))
        return null;

    return Guid.TryParse(warehouseIdClaim, out var warehouseId) ? warehouseId : null;
}
```

### 3. **ApplicationDbContext áp dụng HasQueryFilter**

Trong `OnModelCreating`, `ApplicationDbContext` sử dụng `HasQueryFilter()` để tự động gắn điều kiện `WHERE WarehouseId = currentWarehouseId` vào mọi truy vấn Entity Framework:

```csharp
var currentWarehouseId = _currentUserContext.GetCurrentWarehouseId();

if (currentWarehouseId.HasValue)
{
    modelBuilder.Entity<Inventory>()
        .HasQueryFilter(i => i.WarehouseId == currentWarehouseId.Value);
}
```

---

## 📦 Các Entity được Filter

Các Entity sau được tự động lọc theo `WarehouseId`:

| Entity | Filter Condition | Ghi chú |
|--------|------------------|--------|
| **Inventory** | `WarehouseId == currentWarehouseId` | Dữ liệu tồn kho |
| **Receipt** | `WarehouseId == currentWarehouseId` | Phiếu Nhập |
| **Issue** | `WarehouseId == currentWarehouseId` | Phiếu Xuất |
| **InventoryTransaction** | `Zone.WarehouseId == currentWarehouseId` | Thẻ kho (lọc qua Zone) |
| **ReceiptDetail** | `Receipt.WarehouseId == currentWarehouseId` | Chi tiết Phiếu Nhập (lọc qua Receipt) |
| **IssueDetail** | `Issue.WarehouseId == currentWarehouseId` | Chi tiết Phiếu Xuất (lọc qua Issue) |

---

## 🔑 Admin User (WarehouseId = null)

**Trường hợp đặc biệt:** Nếu user là **Admin** (không gán Kho cụ thể), `WarehouseId` sẽ là `null`:

```csharp
if (currentWarehouseId.HasValue)
{
    // Chỉ áp dụng filter nếu user có WarehouseId
    modelBuilder.Entity<Inventory>()
        .HasQueryFilter(i => i.WarehouseId == currentWarehouseId.Value);
}
```

**Hành vi:**
- Admin user có `WarehouseId = null` → `currentWarehouseId = null`
- Filter **KHÔNG được áp dụng** → Admin có thể xem **TẤT CẢ dữ liệu** từ mọi Kho
- (Optional) Nếu muốn Admin chỉ xem dữ liệu Kho cụ thể, phải cấu hình `WarehouseId` cho Admin user

---

## 📝 Yêu Cầu Cấu Hình

### 1. **Program.cs - Thêm Required Services**

```csharp
// Thêm HttpContextAccessor (bắt buộc để lấy HttpContext)
builder.Services.AddHttpContextAccessor();

// Thêm AddDbContext (nó sẽ inject ICurrentUserContext vào DbContext constructor)
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Thêm ApplicationServices
builder.Services.AddApplicationServices();

// Thêm InfrastructureServices (đăng ký ICurrentUserContext)
builder.Services.AddInfrastructureServices();
```

### 2. **appsettings.json - JWT Configuration**

```json
{
  "Jwt": {
    "Key": "your-super-secret-key-at-least-32-chars-long",
    "Issuer": "WMS_MiniFulfillment",
    "Audience": "WMS_Client",
    "AccessTokenExpirationMinutes": 15,
    "RefreshTokenExpirationDays": 7
  }
}
```

### 3. **User Database Setup**

Đảm bảo User table có:
- `RoleId` (FK đến Role)
- `WarehouseId` (Nullable, FK đến Warehouse)
- `RefreshToken` (lưu Refresh Token)
- `RefreshTokenExpiryTime` (lưu ngày hết hạn Refresh Token)

---

## 🧪 Kiểm Thử Global Query Filter

### Test Case 1: Staff User (WarehouseId được gán)

```bash
# 1. Đăng nhập với Staff user
POST /api/auth/login
{
  "username": "staff_warehouse_1",
  "password": "password123"
}

# Response
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",  // Chứa WarehouseId claim
    "refreshToken": "base64string..."
  }
}

# 2. Gọi API GET với token
GET /api/inventories
Authorization: Bearer eyJhbGc...

# ✅ Kết quả: Chỉ trả về Inventory của Warehouse được gán cho Staff
```

### Test Case 2: Admin User (WarehouseId = null)

```bash
# 1. Đăng nhập với Admin user
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}

# Response: Token KHÔNG chứa WarehouseId claim

# 2. Gọi API GET với token
GET /api/inventories
Authorization: Bearer eyJhbGc...

# ✅ Kết quả: Trả về Inventory từ TẤT CẢ Warehouse (vì không có filter)
```

---

## ⚠️ Important Notes

### 1. **UseAsNoTracking() cho API GET danh sách**

Để tối ưu hiệu năng, bắt buộc thêm `.AsNoTracking()` vào tất cả các truy vấn GET danh sách:

```csharp
public async Task<IEnumerable<Inventory>> GetAllAsync()
{
    return await _context.Inventories
        .AsNoTracking()  // ✅ Bắt buộc
        .ToListAsync();
}
```

### 2. **Include() cho Navigation Properties**

Nếu cần tải dữ liệu liên quan (VD: Warehouse, Product), dùng `.Include()`:

```csharp
return await _context.Inventories
    .AsNoTracking()
    .Include(i => i.Product)
    .Include(i => i.Warehouse)
    .ToListAsync();
```

### 3. **Disable Filter khi cần (Very Rare)**

Nếu cần bypass Global Query Filter (rất hiếm), dùng `IgnoreQueryFilters()`:

```csharp
var allInventories = await _context.Inventories
    .IgnoreQueryFilters()  // ⚠️ Cẩn thận: Lấy TẤT CẢ dữ liệu
    .ToListAsync();
```

---

## 🚀 Best Practices

✅ **DO:**
- Luôn kiểm tra xem `WarehouseId` đã được gán cho user chưa trước khi tạo bản ghi
- Sử dụng `AsNoTracking()` cho API GET danh sách để giảm bộ nhớ
- Thêm `Include()` cho navigation properties nếu cần dữ liệu liên quan
- Kiểm tra JWT Token có chứa `WarehouseId` claim bằng JWT Debugger (jwt.io)

❌ **DON'T:**
- KHÔNG tự ý viết `.Where(x => x.WarehouseId == id)` trong Repository (để Global Query Filter xử lý)
- KHÔNG quên đăng ký `ICurrentUserContext` trong DI container
- KHÔNG quên thêm `AddHttpContextAccessor()` vào Program.cs
- KHÔNG để Admin user có `WarehouseId` khác null (trừ ngoại lệ đặc biệt)

---

## 📞 Troubleshooting

### Error: "Unable to resolve service for type ICurrentUserContext"

**Nguyên nhân:** `ICurrentUserContext` chưa được đăng ký trong DI.

**Giải pháp:** Thêm vào `DependencyInjection.cs`:
```csharp
services.AddScoped<ICurrentUserContext, CurrentUserContext>();
```

### Error: "No service for type IHttpContextAccessor"

**Nguyên nhân:** `AddHttpContextAccessor()` chưa được gọi trong Program.cs.

**Giải pháp:** Thêm vào Program.cs:
```csharp
builder.Services.AddHttpContextAccessor();
```

### WarehouseId claim không có trong JWT Token

**Nguyên nhân:** User có `WarehouseId = null` (Admin user).

**Giải pháp:** Kiểm tra `GetCurrentWarehouseId()` sẽ trả về `null` → Filter sẽ không được áp dụng → Lấy tất cả dữ liệu.

---

## 📚 References

- [Entity Framework Core Query Filters](https://learn.microsoft.com/en-us/ef/core/querying/filters)
- [JWT.io - Debugger](https://jwt.io)
- [System.Security.Claims](https://docs.microsoft.com/en-us/dotnet/api/system.security.claims)
- [IHttpContextAccessor](https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.ihttpcontextaccessor)

---

**Cập nhật:** 29/04/2026
