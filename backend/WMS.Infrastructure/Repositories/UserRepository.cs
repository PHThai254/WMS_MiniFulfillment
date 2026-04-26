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
    /// Cập nhật thông tin user (bao gồm Refresh Token) vào database.
    /// </summary>
    /// <param name="user">Người dùng cần cập nhật</param>
    public async Task UpdateAsync(User user)
    {
        _dbContext.Users.Update(user);
        await _dbContext.SaveChangesAsync();
    }
}
