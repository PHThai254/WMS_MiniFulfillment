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

    /// <summary>
    /// Đăng nhập: Trả về cặp AccessToken/RefreshToken kèm thông tin User và danh sách Permissions.
    /// Frontend dùng mảng Permissions để phân quyền UI ngay sau khi đăng nhập mà không cần gọi thêm API.
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<object>>> Login([FromBody] LoginRequest request)
    {
        var (accessToken, refreshToken) = await _authService.LoginAsync(request.Username, request.Password);

        // Lấy userId từ claims của Access Token vừa sinh để query UserDto (bao gồm Permissions)
        var userIdStr = GetUserIdFromToken(accessToken);
        object? userInfo = null;
        if (Guid.TryParse(userIdStr, out var userId))
        {
            var userDto = await _userManagementService.GetByIdAsync(userId);
            if (userDto is not null)
            {
                userInfo = new
                {
                    id          = userDto.Id,
                    username    = userDto.Username,
                    role        = userDto.RoleName,
                    warehouseId = userDto.WarehouseId,
                    warehouseName = userDto.WarehouseName,
                    permissions = userDto.Permissions
                };
            }
        }

        var result = new
        {
            AccessToken  = accessToken,
            RefreshToken = refreshToken,
            User         = userInfo
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
    /// Lấy thông tin người dùng hiện tại từ JWT Token, bao gồm danh sách Permissions.
    /// Frontend dùng endpoint này để xác minh token còn hợp lệ và lấy thông tin user (kể cả Permissions).
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
            id            = user.Id,
            username      = user.Username,
            role          = user.RoleName,
            warehouseId   = user.WarehouseId,
            warehouseName = user.WarehouseName,
            permissions   = user.Permissions   // ← danh sách ["run_ocr", "view_dashboard_kpi", ...]
        };

        return Ok(ApiResponse<object>.Succeeded(result));
    }

    /// <summary>
    /// Parse userId (NameIdentifier claim) từ JWT Access Token string mà không cần validate signature.
    /// Dùng nội bộ sau Login để tránh query DB thêm một lần nữa cho Username.
    /// </summary>
    private static string? GetUserIdFromToken(string accessToken)
    {
        try
        {
            var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(accessToken);
            return jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        }
        catch
        {
            return null;
        }
    }
}

