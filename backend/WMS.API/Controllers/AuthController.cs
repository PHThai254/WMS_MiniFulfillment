using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WMS.Application.Interfaces;
using WMS.Application.Wrappers;
using WMS.Application.DTOs.Auth;

namespace WMS.API.Controllers;

/// <summary>
/// AuthController: Xử lý các request liên quan đến xác thực (Authentication).
/// </summary>
[ApiController]
[Route("api/Auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IUserManagementService _userManagementService;

    public AuthController(IAuthService authService, IUserManagementService userManagementService)
    {
        _authService = authService;
        _userManagementService = userManagementService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<object>>> Login([FromBody] LoginRequest request)
    {
        var (accessToken, refreshToken) = await _authService.LoginAsync(request.Username, request.Password);

        var result = new
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken
        };

        return Ok(ApiResponse<object>.Succeeded(result, "Đăng nhập thành công"));
    }

    [HttpPost("refresh-token")]
    public async Task<ActionResult<ApiResponse<object>>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var (accessToken, refreshToken) = await _authService.RefreshTokenAsync(request.AccessToken, request.RefreshToken);
        return Ok(ApiResponse<object>.Succeeded(new { AccessToken = accessToken, RefreshToken = refreshToken }, "Làm mới token thành công"));
    }

    /// <summary>
    /// Lấy thông tin người dùng hiện tại từ JWT Token
    /// Frontend dùng endpoint này để xác minh token còn hợp lệ và lấy thông tin user
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<object>>> GetMe()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<object>.Failed("Token không hợp lệ."));

        var user = await _userManagementService.GetByIdAsync(userId);
        if (user is null) return NotFound(ApiResponse<object>.Failed("Không tìm thấy người dùng."));

        var result = new
        {
            id = user.Id,
            username = user.Username,
            role = user.RoleName,
            warehouseId = user.WarehouseId,
            warehouseName = user.WarehouseName
        };

        return Ok(ApiResponse<object>.Succeeded(result));
    }
}
