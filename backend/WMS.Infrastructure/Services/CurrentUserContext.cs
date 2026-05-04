using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using WMS.Application.Interfaces;

namespace WMS.Infrastructure.Services;

/// <summary>
/// Implementation để lấy thông tin người dùng hiện tại từ HttpContext (JWT Token)
/// </summary>
public class CurrentUserContext : ICurrentUserContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor ?? throw new ArgumentNullException(nameof(httpContextAccessor));
    }

    public Guid? GetCurrentWarehouseId()
    {
        var warehouseIdClaim = _httpContextAccessor.HttpContext?.User.FindFirst("WarehouseId")?.Value;

        if (string.IsNullOrEmpty(warehouseIdClaim))
            return null;

        return Guid.TryParse(warehouseIdClaim, out var warehouseId) ? warehouseId : null;
    }

    public string? GetCurrentUserId()
    {
        return _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    public string? GetCurrentUserRole()
    {
        return _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.Role)?.Value;
    }
}
