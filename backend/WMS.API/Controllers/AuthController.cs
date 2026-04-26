using Microsoft.AspNetCore.Mvc;
using WMS.Application.Interfaces;
using WMS.Application.Wrappers;
using WMS.Application.DTOs.Auth;

namespace WMS.API.Controllers;

/// <summary>
/// AuthController: Xử lý các request liên quan đến xác thực (Authentication).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    /// <summary>
    /// Constructor: Inject IAuthService thông qua Dependency Injection.
    /// </summary>
    /// <param name="authService">Dịch vụ xác thực</param>
    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Endpoint đăng nhập: Xác thực username/password và trả về cặp token.
    /// </summary>
    /// <param name="request">LoginRequest chứa Username và Password</param>
    /// <returns>ApiResponse chứa AccessToken và RefreshToken</returns>
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<object>>> Login([FromBody] LoginRequest request)
    {
        // Gọi hàm LoginAsync từ AuthService
        var (accessToken, refreshToken) = await _authService.LoginAsync(request.Username, request.Password);

        // Đóng gói kết quả vào object DTO
        var result = new
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken
        };

        // Trả về response theo chuẩn ApiResponse
        return Ok(ApiResponse<object>.Succeeded(result, "Đăng nhập thành công"));
    }
}
