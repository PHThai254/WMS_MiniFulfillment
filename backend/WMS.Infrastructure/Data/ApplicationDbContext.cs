using Microsoft.EntityFrameworkCore;
using WMS.Domain.Entities;

namespace WMS.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<Warehouse> Warehouses { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        //cấu hình quan hệ 1-N (1 Kho có nhiều Nhân viên)
        modelBuilder.Entity<User>()
            .HasOne(u => u.Warehouse)
            .WithMany(w => w.Users)
            .HasForeignKey(u => u.WarehouseId);
            
    }
}