using System.ComponentModel.DataAnnotations.Schema;
namespace WMS.Domain.Entities;
    public class Product {
        public Guid Id { get; set; }
        public string SKU { get; set; } = string.Empty;
        public string Barcode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? ImagePath { get; set; }
        
        public Guid CategoryId { get; set; }
        public Category? Category { get; set; }

        [Column(TypeName = "decimal(18,0)")]
        public decimal Price { get; set; }
    }