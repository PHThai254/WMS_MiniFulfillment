namespace WMS.Domain.Entities;
    public class Zone {
        public Guid Id { get; set; }
        public Guid WarehouseId { get; set; }
        public string Name { get; set; } = string.Empty;
        
        public Warehouse? Warehouse { get; set; }
    }