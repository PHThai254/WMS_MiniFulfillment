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
                i.Quantity, i.LastRestockedDate)).ToListAsync();
                
        return new WMS.Application.Wrappers.PagedResult<InventoryDto> { Items = items, TotalCount = total, PageIndex = pageIndex, PageSize = pageSize };
    }

    public async Task<List<StockSummaryDto>> GetStockSummaryAsync()
    {
        var invs = await _db.Inventories.Include(i => i.Zone).Include(i => i.Product).AsNoTracking().ToListAsync();
        return invs.GroupBy(i => i.ProductId).Select(g => new StockSummaryDto(
            g.Key, g.First().Product?.Name ?? string.Empty, g.First().Product?.Barcode ?? string.Empty,
            g.First().Product?.SKU ?? string.Empty, g.Sum(i => i.Quantity),
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
                t.Id, t.ProductId, t.Product!.Name, t.ZoneId, t.Zone!.Name,
                t.QuantityChange, t.TransactionType, t.ReferenceId, t.CreatedAt)).ToListAsync();
                
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
            QuantityChange = change, TransactionType = "ADJUST", CreatedAt = DateTime.UtcNow
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
        return await _db.Inventories.IgnoreQueryFilters().Include(i => i.Product)
            .GroupBy(i => new { i.ProductId, i.Product!.Name, i.Product.Barcode })
            .Select(g => new LowStockProductDto(g.Key.ProductId, g.Key.Name, g.Key.Barcode, g.Sum(i => i.Quantity)))
            .OrderBy(s => s.TotalQuantity).Take(top).ToListAsync();
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
                dayTx.Where(t => t.TransactionType == "INBOUND").Sum(t => t.QuantityChange),
                Math.Abs(dayTx.Where(t => t.TransactionType == "OUTBOUND").Sum(t => t.QuantityChange)));
        }).ToList();
    }
}

public class UserManagementService : IUserManagementService
{
    private readonly ApplicationDbContext _db;
    public UserManagementService(ApplicationDbContext db) => _db = db;

    public async Task<List<UserDto>> GetAllAsync() =>
        await _db.Users.Include(u => u.Role).Include(u => u.Warehouse).AsNoTracking()
            .Select(u => new UserDto(u.Id, u.Username, u.Role!.Name, u.RoleId, u.WarehouseId, u.Warehouse != null ? u.Warehouse.Name : null))
            .ToListAsync();

    public async Task<UserDto?> GetByIdAsync(Guid id)
    {
        var u = await _db.Users.Include(u => u.Role).Include(u => u.Warehouse).AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return u is null ? null : new UserDto(u.Id, u.Username, u.Role?.Name ?? string.Empty, u.RoleId, u.WarehouseId, u.Warehouse?.Name);
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
        user.Username = request.Username; user.RoleId = request.RoleId; user.WarehouseId = request.WarehouseId;
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
