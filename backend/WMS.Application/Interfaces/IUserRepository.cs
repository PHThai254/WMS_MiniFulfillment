using WMS.Domain.Entities;

namespace WMS.Application.Interfaces;

/// <summary>
/// Repository interface cho quản lý User - tuân thủ Clean Architecture.
/// Tầng Application định nghĩa interface, tầng Infrastructure triển khai.
/// </summary>
public interface IUserRepository
{
    /// <summary>
    /// Tìm user theo username, bao gồm thông tin Role.
    /// </summary>
    /// <param name="username">Tên đăng nhập</param>
    /// <returns>User object với Role đã được load, hoặc null nếu không tìm thấy</returns>
    Task<User?> GetByUsernameAsync(string username);

    /// <summary>
    /// Cập nhật thông tin user (bao gồm Refresh Token) vào database.
    /// </summary>
    /// <param name="user">Người dùng cần cập nhật</param>
    Task UpdateAsync(User user);
}
