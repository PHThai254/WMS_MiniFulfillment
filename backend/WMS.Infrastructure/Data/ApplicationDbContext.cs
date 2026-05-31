using Microsoft.EntityFrameworkCore;
using WMS.Application.Interfaces;
using WMS.Domain.Entities;

namespace WMS.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    private readonly ICurrentUserContext _currentUserContext;

    public ApplicationDbContext(DbContextOptions options, ICurrentUserContext currentUserContext) 
        : base(options)
    {
        _currentUserContext = currentUserContext ?? throw new ArgumentNullException(nameof(currentUserContext));
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Warehouse> Warehouses { get; set; }
    public DbSet<Zone> Zones { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Inventory> Inventories { get; set; }
    public DbSet<Receipt> Receipts { get; set; }
    public DbSet<ReceiptDetail> ReceiptDetails { get; set; }
    public DbSet<Issue> Issues { get; set; }
    public DbSet<IssueDetail> IssueDetails { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Supplier> Suppliers { get; set; }
    public DbSet<Customer> Customers { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<InventoryTransaction> InventoryTransactions { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Tắt tính năng tự động xóa dây chuyền (Cascade Delete) trên toàn bộ DB
        // Điều này giúp tránh lỗi vòng lặp khóa ngoại (Multiple Cascade Paths) trong SQL Server
        foreach (var relationship in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
        {
            relationship.DeleteBehavior = DeleteBehavior.Restrict;
        }

        // =============== CẤU HÌNH CONCURRENCY TOKEN ===============
        // Cấu hình RowVersion cho Inventory để chống Race Condition
        // RowVersion được EF Core tự động quản lý và cập nhật khi có bất kỳ thay đổi nào
        modelBuilder.Entity<Inventory>()
            .Property(i => i.RowVersion)
            .IsRowVersion();

        // =============== CẤU HÌNH GLOBAL QUERY FILTER THEO WAREHOUSEID ===============
        // Lọc tự động các Entity dựa trên WarehouseId từ JWT Token
        // Chỉ lấy dữ liệu thuộc về Kho của User hiện tại
        
        var currentWarehouseId = _currentUserContext.GetCurrentWarehouseId();

        // 1. Filter Inventory - Lọc theo WarehouseId
        if (currentWarehouseId.HasValue)
        {
            modelBuilder.Entity<Inventory>()
                .HasQueryFilter(i => i.WarehouseId == currentWarehouseId.Value);
        }

        // 2. Filter Receipt - Lọc theo WarehouseId
        if (currentWarehouseId.HasValue)
        {
            modelBuilder.Entity<Receipt>()
                .HasQueryFilter(r => r.WarehouseId == currentWarehouseId.Value);
        }

        // 3. Filter Issue - Lọc theo WarehouseId
        if (currentWarehouseId.HasValue)
        {
            modelBuilder.Entity<Issue>()
                .HasQueryFilter(i => i.WarehouseId == currentWarehouseId.Value);
        }

        // 4. Filter InventoryTransaction - Lọc theo WarehouseId thông qua Zone
        if (currentWarehouseId.HasValue)
        {
            modelBuilder.Entity<InventoryTransaction>()
                .HasQueryFilter(it => it.Zone != null && it.Zone.WarehouseId == currentWarehouseId.Value);
        }

        // 5. Filter ReceiptDetail - Lọc theo WarehouseId thông qua Receipt
        if (currentWarehouseId.HasValue)
        {
            modelBuilder.Entity<ReceiptDetail>()
                .HasQueryFilter(rd => rd.Receipt != null && rd.Receipt.WarehouseId == currentWarehouseId.Value);
        }

        // 6. Filter IssueDetail - Lọc theo WarehouseId thông qua Issue
        if (currentWarehouseId.HasValue)
        {
            modelBuilder.Entity<IssueDetail>()
                .HasQueryFilter(id => id.Issue != null && id.Issue.WarehouseId == currentWarehouseId.Value);
        }
    }
}