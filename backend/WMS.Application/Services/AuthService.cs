using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BCrypt.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

using WMS.Application.Interfaces;
using WMS.Domain.Entities;

namespace WMS.Application.Services;

/// <summary>
/// Triển khai dịch vụ xác thực: Sinh cặp JWT Access Token và Refresh Token.
/// Tuân thủ Clean Architecture (chỉ phụ thuộc Interfaces, không gọi DbContext trực tiếp từ ngoài tầng này).
/// </summary>
public class AuthService : IAuthService
{
    private readonly IConfiguration _configuration;
    private readonly IUserRepository _userRepository;

    public AuthService(IConfiguration configuration, IUserRepository userRepository)
    {
        _configuration = configuration;
        _userRepository = userRepository;
    }

    /// <summary>
    /// Đăng nhập: Xác thực username/password và sinh cặp token.
    /// </summary>
    /// <param name="username">Tên đăng nhập</param>
    /// <param name="password">Mật khẩu</param>
    /// <returns>Cặp (AccessToken, RefreshToken)</returns>
    /// <exception cref="UnauthorizedAccessException">Nếu username không tồn tại hoặc password sai</exception>
    public async Task<(string AccessToken, string RefreshToken)> LoginAsync(string username, string password)
    {
        // Tìm user theo username, bao gồm Role
        var user = await _userRepository.GetByUsernameAsync(username);

        // Kiểm tra nếu user không tồn tại
        if (user is null)
        {
            throw new UnauthorizedAccessException("Tài khoản hoặc mật khẩu không chính xác.");
        }

        // Kiểm tra mật khẩu bằng BCrypt
        var isPasswordValid = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
        if (!isPasswordValid)
        {
            throw new UnauthorizedAccessException("Tài khoản hoặc mật khẩu không chính xác.");
        }

        // Sinh cặp token (Access Token + Refresh Token)
        var tokens = await GenerateTokensAsync(user);

        return tokens;
    }

    /// <summary>
    /// Sinh JWT Access Token (15 phút) và Refresh Token (7 ngày).
    /// Tự động cập nhật User.RefreshToken và RefreshTokenExpiryTime vào DB.
    /// </summary>
    /// <param name="user">Người dùng (phải có Role đã được load từ DB)</param>
    /// <returns>Cặp (AccessToken, RefreshToken)</returns>
    public async Task<(string AccessToken, string RefreshToken)> GenerateTokensAsync(User user)
    {
        // Sinh Access Token (JWT sống 15 phút)
        var accessToken = GenerateAccessToken(user);

        // Sinh Refresh Token (Base64 ngẫu nhiên sống 7 ngày)
        var refreshToken = GenerateRefreshToken();

        // Tính ngày hết hạn của Refresh Token từ appsettings
        var refreshTokenExpirationDaysStr = _configuration["Jwt:RefreshTokenExpirationDays"] ?? "7";
        var refreshTokenExpirationDays = int.Parse(refreshTokenExpirationDaysStr);
        var refreshTokenExpiryTime = DateTime.UtcNow.AddDays(refreshTokenExpirationDays);

        // Cập nhật User object với Refresh Token mới
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = refreshTokenExpiryTime;

        // Lưu xuống Database qua IUserRepository (Strict Nullable: đã đảm bảo gán giá trị trước khi lưu)
        await _userRepository.UpdateAsync(user);

        return (accessToken, refreshToken);
    }

    /// <summary>
    /// Làm mới cặp Token: Kiểm tra Refresh Token hợp lệ, sinh cặp token mới.
    /// </summary>
    /// <param name="accessToken">Access Token cũ (chỉ dùng để log/debug, không validate)</param>
    /// <param name="refreshToken">Refresh Token cần kiểm tra</param>
    /// <returns>Cặp (AccessToken mới, RefreshToken mới)</returns>
    /// <exception cref="UnauthorizedAccessException">Nếu Refresh Token không hợp lệ hoặc đã hết hạn</exception>
    public async Task<(string AccessToken, string RefreshToken)> RefreshTokenAsync(string accessToken, string refreshToken)
    {
        // Tìm user theo Refresh Token, Include Role
        var user = await _userRepository.GetByRefreshTokenAsync(refreshToken);

        // Kiểm tra nếu user không tồn tại hoặc Refresh Token đã hết hạn
        if (user is null || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Refresh Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
        }

        // Sinh cặp token mới (hàm này tự động cập nhật User.RefreshToken vào DB)
        var tokens = await GenerateTokensAsync(user);

        return tokens;
    }

    /// <summary>
    /// Sinh JWT Access Token với claims: NameIdentifier, Name, Role, WarehouseId (nếu có).
    /// Sử dụng HMAC-SHA256 từ IConfiguration: Jwt:Key, Jwt:Issuer, Jwt:Audience.
    /// </summary>
    private string GenerateAccessToken(User user)
    {
        // Lấy JWT configuration từ appsettings
        var jwtKey = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT Key không được cấu hình trong appsettings.");
        
        var jwtIssuer = _configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException("JWT Issuer không được cấu hình trong appsettings.");
        
        var jwtAudience = _configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException("JWT Audience không được cấu hình trong appsettings.");
        
        var accessTokenExpirationMinutesStr = _configuration["Jwt:AccessTokenExpirationMinutes"] ?? "15";
        var accessTokenExpirationMinutes = int.Parse(accessTokenExpirationMinutesStr);

        // Tạo Security Key từ JWT Key (Symmetric Key)
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Xây dựng danh sách Claims
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, user.Role?.Name ?? string.Empty)
        };

        // Thêm WarehouseId claim nếu user có WarehouseId (Nullable-safe)
        if (user.WarehouseId.HasValue)
        {
            claims.Add(new Claim("WarehouseId", user.WarehouseId.ToString()!));
        }

        // Tạo JwtSecurityToken
        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(accessTokenExpirationMinutes),
            signingCredentials: credentials
        );

        // Chuyển đổi token thành chuỗi
        var tokenHandler = new JwtSecurityTokenHandler();
        return tokenHandler.WriteToken(token);
    }

    /// <summary>
    /// Sinh Refresh Token: Chuỗi Base64 ngẫu nhiên 32 bytes an toàn.
    /// Sử dụng RandomNumberGenerator từ System.Security.Cryptography.
    /// </summary>
    private static string GenerateRefreshToken()
    {
        // Tạo mảng 32 bytes ngẫu nhiên
        var randomNumber = new byte[32];
        
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomNumber);
        }

        // Encode thành Base64 string
        return Convert.ToBase64String(randomNumber);
    }
}

