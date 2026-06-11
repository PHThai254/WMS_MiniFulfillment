using Microsoft.EntityFrameworkCore;
using WMS.Application.Interfaces;
using WMS.Domain.Entities;
using WMS.Domain.Enums;

namespace WMS.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    private readonly ICurrentUserContext _currentUserContext;

    public ApplicationDbContext(DbContextOptions options, ICurrentUserContext currentUserContext)
        : base(options)
    {
        _currentUserContext = currentUserContext ?? throw new ArgumentNullException(nameof(currentUserContext));
    }

    // ── Master Data ──────────────────────────────────────────────────────────
    public DbSet<Role> Roles { get; set; }
    public DbSet<Permission> Permissions { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Warehouse> Warehouses { get; set; }
    public DbSet<Zone> Zones { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Supplier> Suppliers { get; set; }
    public DbSet<Customer> Customers { get; set; }

    // ── Inventory ────────────────────────────────────────────────────────────
    public DbSet<Inventory> Inventories { get; set; }
    public DbSet<InventoryTransaction> InventoryTransactions { get; set; }

    // ── Operations ───────────────────────────────────────────────────────────
    public DbSet<Receipt> Receipts { get; set; }
    public DbSet<ReceiptDetail> ReceiptDetails { get; set; }
    public DbSet<Issue> Issues { get; set; }
    public DbSet<IssueDetail> IssueDetails { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ════════════════════════════════════════════════════════════════════
        // 1. GLOBAL: Tắt Cascade Delete toàn bộ để tránh Multiple Cascade Paths
        // ════════════════════════════════════════════════════════════════════
        foreach (var relationship in modelBuilder.Model.GetEntityTypes()
                     .SelectMany(e => e.GetForeignKeys()))
        {
            relationship.DeleteBehavior = DeleteBehavior.Restrict;
        }

        // ════════════════════════════════════════════════════════════════════
        // 2. ROLE & PERMISSION – RBAC Động
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<Role>(e =>
        {
            e.Property(r => r.Name).HasMaxLength(50).IsRequired();
        });

        modelBuilder.Entity<Permission>(e =>
        {
            e.Property(p => p.Name).HasMaxLength(100).IsRequired();
            e.Property(p => p.Group).HasMaxLength(50).IsRequired();
            // Unique Index trên Permission.Name
            e.HasIndex(p => p.Name).IsUnique().HasDatabaseName("IX_Permissions_Name_Unique");
        });

        // Composite PK cho bảng liên kết RolePermission
        modelBuilder.Entity<RolePermission>(e =>
        {
            e.HasKey(rp => new { rp.RoleId, rp.PermissionId });

            e.HasOne(rp => rp.Role)
             .WithMany(r => r.RolePermissions)
             .HasForeignKey(rp => rp.RoleId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(rp => rp.Permission)
             .WithMany(p => p.RolePermissions)
             .HasForeignKey(rp => rp.PermissionId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ════════════════════════════════════════════════════════════════════
        // 3. USER – Unique Index Username, MaxLength constraints
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<User>(e =>
        {
            e.Property(u => u.Username).HasMaxLength(100).IsRequired();
            e.Property(u => u.PasswordHash).HasMaxLength(256).IsRequired();
            e.HasIndex(u => u.Username).IsUnique().HasDatabaseName("IX_Users_Username_Unique");

            // FK User → Role (nhiều User cùng Role, nhưng Restrict delete)
            e.HasOne(u => u.Role)
             .WithMany(r => r.Users)
             .HasForeignKey(u => u.RoleId)
             .OnDelete(DeleteBehavior.Restrict);

            // FK User → Warehouse (nullable, Admin không có kho cụ thể)
            e.HasOne(u => u.Warehouse)
             .WithMany(w => w.Users)
             .HasForeignKey(u => u.WarehouseId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ════════════════════════════════════════════════════════════════════
        // 4. PRODUCT – Unique Indexes SKU + Barcode, decimal(18,2)
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<Product>(e =>
        {
            e.Property(p => p.SKU).HasMaxLength(50).IsRequired();
            e.Property(p => p.Barcode).HasMaxLength(50).IsRequired();
            e.Property(p => p.Name).HasMaxLength(200).IsRequired();
            e.Property(p => p.Price).HasColumnType("decimal(18,2)");

            e.HasIndex(p => p.SKU).IsUnique().HasDatabaseName("IX_Products_SKU_Unique");
            e.HasIndex(p => p.Barcode).IsUnique().HasDatabaseName("IX_Products_Barcode_Unique");
        });

        // ════════════════════════════════════════════════════════════════════
        // 5. INVENTORY – Composite Unique Index + RowVersion ConcurrencyToken
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<Inventory>(e =>
        {
            // Composite Unique: một kho + zone + sản phẩm chỉ có 1 bản ghi tồn kho
            e.HasIndex(i => new { i.WarehouseId, i.ZoneId, i.ProductId })
             .IsUnique()
             .HasDatabaseName("IX_Inventory_Warehouse_Zone_Product_Unique");

            // RowVersion – EF Core tự cập nhật, dùng để chống Race Condition
            e.Property(i => i.RowVersion).IsRowVersion();
        });

        // ════════════════════════════════════════════════════════════════════
        // 6. RECEIPT – FK CreatedByUserId → User, decimal(18,2) trong Detail
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<Receipt>(e =>
        {
            e.HasOne(r => r.CreatedByUser)
             .WithMany()
             .HasForeignKey(r => r.CreatedByUserId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.Supplier)
             .WithMany(s => s.Receipts)
             .HasForeignKey(r => r.SupplierId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ReceiptDetail>(e =>
        {
            e.Property(rd => rd.UnitPrice).HasColumnType("decimal(18,2)");
        });

        // ════════════════════════════════════════════════════════════════════
        // 7. ISSUE – FK CreatedByUserId → User
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<Issue>(e =>
        {
            e.HasOne(i => i.CreatedByUser)
             .WithMany()
             .HasForeignKey(i => i.CreatedByUserId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(i => i.Customer)
             .WithMany(c => c.Issues)
             .HasForeignKey(i => i.CustomerId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ════════════════════════════════════════════════════════════════════
        // 8. INVENTORY TRANSACTION – enum lưu dưới dạng string
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<InventoryTransaction>(e =>
        {
            e.Property(it => it.TransactionType)
             .HasConversion<string>()
             .HasMaxLength(20);
        });

        // ════════════════════════════════════════════════════════════════════
        // 9. MISC Max Lengths
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<Warehouse>(e =>
        {
            e.Property(w => w.Name).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<Zone>(e =>
        {
            e.Property(z => z.Name).HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<Category>(e =>
        {
            e.Property(c => c.Name).HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<Supplier>(e =>
        {
            e.Property(s => s.Name).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<Customer>(e =>
        {
            e.Property(c => c.Name).HasMaxLength(200).IsRequired();
        });

        // ════════════════════════════════════════════════════════════════════
        // 10. GLOBAL QUERY FILTER – Tự động lọc theo WarehouseId từ JWT
        //     PHẢI dùng lambda expression tham chiếu _currentUserContext
        //     (KHÔNG gọi GetCurrentWarehouseId() trực tiếp ở đây vì DbContext
        //     được resolve 1 lần, còn filter chạy per-request)
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<Inventory>()
            .HasQueryFilter(i =>
                !_currentUserContext.GetCurrentWarehouseId().HasValue
                || i.WarehouseId == _currentUserContext.GetCurrentWarehouseId()!.Value);

        modelBuilder.Entity<Receipt>()
            .HasQueryFilter(r =>
                !_currentUserContext.GetCurrentWarehouseId().HasValue
                || r.WarehouseId == _currentUserContext.GetCurrentWarehouseId()!.Value);

        modelBuilder.Entity<Issue>()
            .HasQueryFilter(i =>
                !_currentUserContext.GetCurrentWarehouseId().HasValue
                || i.WarehouseId == _currentUserContext.GetCurrentWarehouseId()!.Value);

        modelBuilder.Entity<InventoryTransaction>()
            .HasQueryFilter(it =>
                it.Zone == null
                || !_currentUserContext.GetCurrentWarehouseId().HasValue
                || it.Zone.WarehouseId == _currentUserContext.GetCurrentWarehouseId()!.Value);

        modelBuilder.Entity<ReceiptDetail>()
            .HasQueryFilter(rd =>
                rd.Receipt == null
                || !_currentUserContext.GetCurrentWarehouseId().HasValue
                || rd.Receipt.WarehouseId == _currentUserContext.GetCurrentWarehouseId()!.Value);

        modelBuilder.Entity<IssueDetail>()
            .HasQueryFilter(id =>
                id.Issue == null
                || !_currentUserContext.GetCurrentWarehouseId().HasValue
                || id.Issue.WarehouseId == _currentUserContext.GetCurrentWarehouseId()!.Value);
    }
}