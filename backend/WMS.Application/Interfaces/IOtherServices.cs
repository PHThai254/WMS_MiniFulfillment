using WMS.Application.DTOs.Inventory;
using WMS.Application.DTOs.Analytics;
using WMS.Application.DTOs.UserManagement;

namespace WMS.Application.Interfaces;

using WMS.Application.Wrappers;

public interface IInventoryService
{
    Task<PagedResult<InventoryDto>> GetAllAsync(int pageIndex, int pageSize, Guid? warehouseId = null, Guid? zoneId = null);
    Task<List<StockSummaryDto>> GetStockSummaryAsync();
    Task<PagedResult<InventoryTransactionDto>> GetTransactionsAsync(int pageIndex, int pageSize);
    Task AdjustAsync(AdjustInventoryRequest request, string adjustedBy);
}

public interface IAnalyticsService
{
    Task<DashboardKpiDto> GetKpiAsync();
    Task<List<LowStockProductDto>> GetLowStockProductsAsync(int top = 5);
    Task<List<StockMovementDto>> GetStockMovementsAsync(int days = 7);
}

public interface IUserManagementService
{
    Task<List<UserDto>> GetAllAsync();
    Task<UserDto?> GetByIdAsync(Guid id);
    Task<UserDto> CreateAsync(CreateUserRequest request);
    Task<UserDto> UpdateAsync(Guid id, UpdateUserRequest request);
    Task ChangePasswordAsync(Guid id, string newPassword);
    Task DeleteAsync(Guid id);
    Task<List<RoleDto>> GetRolesAsync();
}
