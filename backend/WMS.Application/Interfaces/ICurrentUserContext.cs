namespace WMS.Application.Interfaces;

/// <summary>
/// Interface để lấy thông tin người dùng hiện tại từ JWT Token
/// </summary>
public interface ICurrentUserContext
{
    /// <summary>
    /// Lấy WarehouseId của người dùng hiện tại từ JWT Token
    /// Nếu user là Admin, trả về null. Nếu là Staff/QA, trả về WarehouseId được gán.
    /// </summary>
    Guid? GetCurrentWarehouseId();

    /// <summary>
    /// Lấy UserId của người dùng hiện tại
    /// </summary>
    string? GetCurrentUserId();

    /// <summary>
    /// Lấy Role của người dùng hiện tại
    /// </summary>
    string? GetCurrentUserRole();
}
