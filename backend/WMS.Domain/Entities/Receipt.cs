using WMS.Domain.Enums;
    namespace WMS.Domain.Entities;
    public class Receipt {
        public Guid Id { get; set; }
        public Guid WarehouseId { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public ReceiptStatus Status { get; set; }
        
        public Warehouse? Warehouse { get; set; }
        public ICollection<ReceiptDetail> ReceiptDetails { get; set; } = new List<ReceiptDetail>();
    }