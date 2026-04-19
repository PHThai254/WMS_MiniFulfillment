namespace WMS.Domain.Entities;
    public class User
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = "Staff"; // Chứa các giá trị: Admin, QA_QC, Staff
        
        // Nullable vì Admin quản lý tổng, không thuộc kho nào cụ thể
        public Guid? WarehouseId { get; set; } 
        public Warehouse? Warehouse { get; set; }

        // Cơ chế bảo mật Token kép
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiryTime { get; set; }
    }