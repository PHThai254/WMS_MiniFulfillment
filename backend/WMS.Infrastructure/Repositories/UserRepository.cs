using Microsoft.EntityFrameworkCore;
using WMS.Application.Interfaces;
using WMS.Domain.Entities;
using WMS.Infrastructure.Data;

namespace WMS.Infrastructure.Repositories;

/// <summary>
/// Triển khai Repository cho User - cấu hình tầng Infrastructure.
/// </summary>
public class UserRepository : IUserRepository
{
    private readonly ApplicationDbContext _dbContext;

    public UserRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Tìm user theo username, bao gồm Role → RolePermissions → Permission.
    /// Dùng một query duy nhất (eager loading), không N+1.
    /// </summary>
    /// <param name="username">Tên đăng nhập</param>
    /// <returns>User object với Role và Permissions đã được load, hoặc null nếu không tìm thấy</returns>
    public async Task<User?> GetByUsernameAsync(string username)
    {
        return await _dbContext.Users
            .Include(u => u.Role!)
                .ThenInclude(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Username == username);
    }

    /// <summary>
    /// Cập nhật thông tin user (bao gồm Refresh Token) vào database.
    /// </summary>
    /// <param name="user">Người dùng cần cập nhật</param>
    public async Task UpdateAsync(User user)
    {
        _dbContext.Users.Update(user);
        await _dbContext.SaveChangesAsync();
    }

    /// <summary>
    /// Tìm user theo Refresh Token, bao gồm Role → RolePermissions → Permission.
    /// Dùng một query duy nhất (eager loading), không N+1.
    /// </summary>
    /// <param name="refreshToken">Refresh Token</param>
    /// <returns>User object với Role và Permissions đã được load, hoặc null nếu không tìm thấy</returns>
    public async Task<User?> GetByRefreshTokenAsync(string refreshToken)
    {
        return await _dbContext.Users
            .Include(u => u.Role!)
                .ThenInclude(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);
    }
}

