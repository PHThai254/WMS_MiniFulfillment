using WMS.Domain.Entities;

namespace WMS.Application.Interfaces;

/// <summary>
/// Interface định nghĩa các hành động xác thực (Authentication).
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Sinh cặp token: Access Token (JWT, sống 15 phút) và Refresh Token (Base64 ngẫu nhiên, sống 7 ngày).
    /// Tự động cập nhật User.RefreshToken và User.RefreshTokenExpiryTime vào Database.
    /// </summary>
    /// <param name="user">Người dùng cần sinh token (phải có Role đã được load từ DB)</param>
    /// <returns>Cặp (AccessToken, RefreshToken) dùng cho client</returns>
    Task<(string AccessToken, string RefreshToken)> GenerateTokensAsync(User user);
    Task<(string AccessToken, string RefreshToken)> LoginAsync(string username, string password);
    Task<(string AccessToken, string RefreshToken)> RefreshTokenAsync(string accessToken, string refreshToken);
}
