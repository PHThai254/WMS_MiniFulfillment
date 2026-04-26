using WMS.Domain.Entities;

namespace WMS.Application.Interfaces;

/// <summary>
/// Repository interface cho quản lý User - tuân thủ Clean Architecture.
/// Tầng Application định nghĩa interface, tầng Infrastructure triển khai.
/// </summary>
public interface IUserRepository
{
    /// <summary>
    /// Cập nhật thông tin user (bao gồm Refresh Token) vào database.
    /// </summary>
    /// <param name="user">Người dùng cần cập nhật</param>
    Task UpdateAsync(User user);
}
