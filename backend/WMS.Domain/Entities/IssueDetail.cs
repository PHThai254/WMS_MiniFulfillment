namespace WMS.Domain.Entities;
    public class IssueDetail {
        public Guid Id { get; set; }
        public Guid IssueId { get; set; }
        public Guid ProductId { get; set; }
        public Guid? ZoneId { get; set; }
        public int QuantityToPick { get; set; }
        public int PickedQuantity { get; set; }
        
        public Issue? Issue { get; set; }
        public Product? Product { get; set; }
        public Zone? Zone { get; set; }
    }