namespace WMS.Domain.Entities;
    public class Product {
        public Guid Id { get; set; }
        public string SKU { get; set; } = string.Empty;
        public string Barcode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        
        public Guid CategoryId { get; set; }
        public Category? Category { get; set; }
    }