namespace WMS.Domain.Entities;
    public class Inventory {
        public Guid Id { get; set; }
        public Guid WarehouseId { get; set; }
        public Guid ZoneId { get; set; }
        public Guid ProductId { get; set; }
        public int Quantity { get; set; }
        public DateTime LastRestockedDate { get; set; } // Dùng cho thuật toán FIFO
        
        public Warehouse? Warehouse { get; set; }
        public Zone? Zone { get; set; }
        public Product? Product { get; set; }
    }