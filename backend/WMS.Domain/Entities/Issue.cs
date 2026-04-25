using WMS.Domain.Enums;
    namespace WMS.Domain.Entities;
    public class Issue {
        public Guid Id { get; set; }
        public Guid WarehouseId { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public IssueStatus Status { get; set; } = IssueStatus.Pending;
        
        public Warehouse? Warehouse { get; set; }

        public Guid? CustomerId { get; set; }
        public Customer? Customer { get; set; }
        public ICollection<IssueDetail> IssueDetails { get; set; } = new List<IssueDetail>();
    }