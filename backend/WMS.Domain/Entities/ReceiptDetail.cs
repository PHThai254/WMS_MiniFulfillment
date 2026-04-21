namespace WMS.Domain.Entities;
    public class ReceiptDetail {
        public Guid Id { get; set; }
        public Guid ReceiptId { get; set; }
        public Guid ProductId { get; set; }
        public Guid? ZoneId { get; set; }
        public int ExpectedQuantity { get; set; }
        public int ActualQuantity { get; set; }
        
        public Receipt? Receipt { get; set; }
        public Product? Product { get; set; }
        public Zone? Zone { get; set; }
    }