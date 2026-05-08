using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using WMS.Domain.Entities;

namespace WMS.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        await context.Database.MigrateAsync();

        var adminRole = await EnsureRolesAsync(context);
        await EnsureAdminUserAsync(context, adminRole);
    }

    private static async Task<Role> EnsureRolesAsync(ApplicationDbContext context)
    {
        var existingRoles = await context.Roles.ToListAsync();
        var adminRole = existingRoles.FirstOrDefault(role => role.Name == "Admin");

        if (adminRole == null)
        {
            adminRole = new Role
            {
                Id = Guid.NewGuid(),
                Name = "Admin",
                Description = "System administrator"
            };
            context.Roles.Add(adminRole);
        }

        if (existingRoles.All(role => role.Name != "QA_QC"))
        {
            context.Roles.Add(new Role
            {
                Id = Guid.NewGuid(),
                Name = "QA_QC",
                Description = "Quality assurance"
            });
        }

        if (existingRoles.All(role => role.Name != "Staff"))
        {
            context.Roles.Add(new Role
            {
                Id = Guid.NewGuid(),
                Name = "Staff",
                Description = "Warehouse staff"
            });
        }

        if (existingRoles.All(role => role.Name != "Manager"))
        {
            context.Roles.Add(new Role
            {
                Id = Guid.NewGuid(),
                Name = "Manager",
                Description = "Warehouse manager"
            });
        }

        await context.SaveChangesAsync();
        return adminRole;
    }

    private static async Task EnsureAdminUserAsync(ApplicationDbContext context, Role adminRole)
    {
        var hasAdmin = await context.Users.AnyAsync(u => u.Username == "admin");
        if (hasAdmin)
        {
            return;
        }

        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            RoleId = adminRole.Id,
            WarehouseId = null
        };

        context.Users.Add(adminUser);
        await context.SaveChangesAsync();
    }
}
