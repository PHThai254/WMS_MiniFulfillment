namespace WMS.Domain.Entities;
    public class User
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;

        public Guid RoleId { get; set;}
        public Role? Role { get; set; }
        
        // Nullable vì Admin quản lý tổng, không thuộc kho nào cụ thể
        public Guid? WarehouseId { get; set; } 
        public Warehouse? Warehouse { get; set; }

        // Cơ chế bảo mật Token kép
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiryTime { get; set; }
    }