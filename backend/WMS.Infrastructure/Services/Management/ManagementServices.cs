using Microsoft.EntityFrameworkCore;
using WMS.Application.Wrappers;
using WMS.Application.DTOs.Analytics;
using WMS.Application.DTOs.Inventory;
using WMS.Application.DTOs.UserManagement;
using WMS.Application.Interfaces;
using WMS.Domain.Entities;
using WMS.Domain.Enums;
using WMS.Infrastructure.Data;

namespace WMS.Infrastructure.Services.Management;

public class InventoryService : IInventoryService
{
    private readonly ApplicationDbContext _db;
    public InventoryService(ApplicationDbContext db) => _db = db;

    public async Task<PagedResult<InventoryDto>> GetAllAsync(int pageIndex, int pageSize, Guid? warehouseId = null, Guid? zoneId = null)
    {
        var query = _db.Inventories.Include(i => i.Warehouse).Include(i => i.Zone).Include(i => i.Product).AsNoTracking();
        if (warehouseId.HasValue) query = query.Where(i => i.WarehouseId == warehouseId.Value);
        if (zoneId.HasValue) query = query.Where(i => i.ZoneId == zoneId.Value);
        
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(i => i.LastRestockedDate)
            .Skip((pageIndex - 1) * pageSize).Take(pageSize)
            .Select(i => new InventoryDto(
                i.Id, i.WarehouseId, i.Warehouse!.Name, i.ZoneId, i.Zone!.Name,
                i.ProductId, i.Product!.Name, i.Product.Barcode, i.Product.SKU,
                i.Product.Price, i.Quantity, i.LastRestockedDate)).ToListAsync();
                
        return new WMS.Application.Wrappers.PagedResult<InventoryDto> { Items = items, TotalCount = total, PageIndex = pageIndex, PageSize = pageSize };
    }

    public async Task<List<StockSummaryDto>> GetStockSummaryAsync()
    {
        var invs = await _db.Inventories.Include(i => i.Zone).Include(i => i.Product).AsNoTracking().ToListAsync();
        return invs.GroupBy(i => i.ProductId).Select(g => new StockSummaryDto(
            g.Key, g.First().Product?.Name ?? string.Empty, g.First().Product?.Barcode ?? string.Empty,
            g.First().Product?.SKU ?? string.Empty,
            g.First().Product?.Price ?? 0m, g.Sum(i => i.Quantity),
            g.Select(i => new StockByZoneDto(i.ZoneId, i.Zone?.Name ?? string.Empty, i.Quantity, i.LastRestockedDate)).ToList()
        )).OrderBy(s => s.TotalQuantity).ToList();
    }

    public async Task<WMS.Application.Wrappers.PagedResult<InventoryTransactionDto>> GetTransactionsAsync(int pageIndex, int pageSize)
    {
        var query = _db.InventoryTransactions.Include(t => t.Product).Include(t => t.Zone).AsNoTracking();
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(t => t.CreatedAt)
            .Skip((pageIndex - 1) * pageSize).Take(pageSize)
            .Select(t => new InventoryTransactionDto(
                t.Id, t.ProductId, t.Product != null ? t.Product.Name : string.Empty,
                t.ZoneId, t.Zone != null ? t.Zone.Name : string.Empty,
                t.QuantityChange, t.TransactionType.ToString(), t.ReferenceId, t.CreatedAt)).ToListAsync();
                
        return new WMS.Application.Wrappers.PagedResult<InventoryTransactionDto> { Items = items, TotalCount = total, PageIndex = pageIndex, PageSize = pageSize };
    }

    public async Task AdjustAsync(AdjustInventoryRequest request, string adjustedBy)
    {
        var inv = await _db.Inventories.FirstOrDefaultAsync(i => i.ProductId == request.ProductId && i.ZoneId == request.ZoneId)
            ?? throw new KeyNotFoundException("Không tìm thấy bản ghi tồn kho.");
        var change = request.NewQuantity - inv.Quantity;
        inv.Quantity = request.NewQuantity;
        _db.InventoryTransactions.Add(new InventoryTransaction
        {
            Id = Guid.NewGuid(), ProductId = request.ProductId, ZoneId = request.ZoneId,
            QuantityChange = change, TransactionType = TransactionType.Adjust, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }
}

public class AnalyticsService : IAnalyticsService
{
    private readonly ApplicationDbContext _db;
    public AnalyticsService(ApplicationDbContext db) => _db = db;

    public async Task<DashboardKpiDto> GetKpiAsync()
    {
        var pendingReceipts = await _db.Receipts.IgnoreQueryFilters()
            .CountAsync(r => r.Status == ReceiptStatus.Draft || r.Status == ReceiptStatus.QC_Checked);
        var activeIssues = await _db.Issues.IgnoreQueryFilters()
            .CountAsync(i => i.Status == IssueStatus.Pending || i.Status == IssueStatus.Picking);
        var totalProducts = await _db.Products.CountAsync();
        var totalWarehouses = await _db.Warehouses.CountAsync();
        var stockByProduct = await _db.Inventories.IgnoreQueryFilters()
            .GroupBy(i => i.ProductId).Select(g => new { Total = g.Sum(i => i.Quantity) }).ToListAsync();
        var lowStockAlerts = stockByProduct.Count(s => s.Total < 10);
        return new DashboardKpiDto(pendingReceipts, activeIssues, totalProducts, totalWarehouses, lowStockAlerts, 0);
    }

    public async Task<List<LowStockProductDto>> GetLowStockProductsAsync(int top = 5)
    {
    // BƯỚC 1: Bắt EF Core dịch sang SQL và tính toán (Dùng Anonymous Type)
    var rawData = await _db.Inventories
        .GroupBy(i => new
        {
            i.ProductId,
            ProductName = i.Product!.Name,
            ProductBarcode = i.Product!.Barcode
        })
        .Select(g => new 
        {
            ProductId = g.Key.ProductId,
            ProductName = g.Key.ProductName,
            ProductBarcode = g.Key.ProductBarcode,
            TotalQuantity = g.Sum(i => i.Quantity)
        })
        .OrderBy(x => x.TotalQuantity)
        .Take(top)
        .ToListAsync(); // <--- Kéo kết quả cuối cùng về RAM máy chủ

    // BƯỚC 2: Map dữ liệu trên RAM vào Record DTO để trả về cho API
    var lowStockProducts = rawData
        .Select(x => new LowStockProductDto(
            x.ProductId,
            x.ProductName,
            x.ProductBarcode,
            x.TotalQuantity
        ))
        .ToList();

    return lowStockProducts;
    }
    public async Task<List<StockMovementDto>> GetStockMovementsAsync(int days = 7)
    {
        var from = DateTime.UtcNow.AddDays(-days).Date;
        var txs = await _db.InventoryTransactions.IgnoreQueryFilters().Where(t => t.CreatedAt >= from).ToListAsync();
        return Enumerable.Range(0, days).Select(i =>
        {
            var date = DateTime.UtcNow.AddDays(-days + i + 1).Date;
            var dayTx = txs.Where(t => t.CreatedAt.Date == date);
            return new StockMovementDto(
                date.ToString("dd/MM"),
                dayTx.Where(t => t.TransactionType == TransactionType.Inbound).Sum(t => t.QuantityChange),
                Math.Abs(dayTx.Where(t => t.TransactionType == TransactionType.Outbound).Sum(t => t.QuantityChange)));
        }).ToList();
    }
}

public class UserManagementService : IUserManagementService
{
    private readonly ApplicationDbContext _db;
    public UserManagementService(ApplicationDbContext db) => _db = db;

    public async Task<List<UserDto>> GetAllAsync() =>
        await _db.Users
            .Include(u => u.Role!)
                .ThenInclude(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .Include(u => u.Warehouse)
            .AsNoTracking()
            .Select(u => new UserDto
            {
                Id          = u.Id,
                Username    = u.Username,
                RoleName    = u.Role!.Name,
                RoleId      = u.RoleId,
                WarehouseId = u.WarehouseId,
                WarehouseName = u.Warehouse != null ? u.Warehouse.Name : null,
                Permissions = u.Role.RolePermissions
                                   .Select(rp => rp.Permission!.Name)
                                   .ToList()
            })
            .ToListAsync();

    public async Task<UserDto?> GetByIdAsync(Guid id)
    {
        var u = await _db.Users
            .Include(u => u.Role!)
                .ThenInclude(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .Include(u => u.Warehouse)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        if (u is null) return null;

        return new UserDto
        {
            Id            = u.Id,
            Username      = u.Username,
            RoleName      = u.Role?.Name ?? string.Empty,
            RoleId        = u.RoleId,
            WarehouseId   = u.WarehouseId,
            WarehouseName = u.Warehouse?.Name,
            Permissions   = u.Role?.RolePermissions
                               .Select(rp => rp.Permission?.Name ?? string.Empty)
                               .Where(name => name.Length > 0)
                               .ToList()
                            ?? new List<string>()
        };
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username)) throw new ArgumentException("Username không được để trống.");
        if (await _db.Users.AnyAsync(u => u.Username == request.Username)) throw new ArgumentException("Username đã tồn tại.");
        var user = new User
        {
            Id = Guid.NewGuid(), Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = request.RoleId, WarehouseId = request.WarehouseId
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(user.Id))!;
    }

    public async Task<UserDto> UpdateAsync(Guid id, UpdateUserRequest request)
    {
    var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id) ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");

    // BỔ SUNG: Kiểm tra xem Username định đổi có bị trùng với người khác không
    if (await _db.Users.AnyAsync(u => u.Username == request.Username && u.Id != id))
    {
        throw new ArgumentException("Tên đăng nhập này đã có người khác sử dụng!");
    }

    user.Username = request.Username; 
    user.RoleId = request.RoleId; 
    user.WarehouseId = request.WarehouseId;
    
    await _db.SaveChangesAsync();
    return (await GetByIdAsync(user.Id))!;
    }

    public async Task ChangePasswordAsync(Guid id, string newPassword)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id) ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id) ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
    }

    public async Task<List<RoleDto>> GetRolesAsync() =>
        await _db.Roles.AsNoTracking().Select(r => new RoleDto(r.Id, r.Name, r.Description)).ToListAsync();
}
