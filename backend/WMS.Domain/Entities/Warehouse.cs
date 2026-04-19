namespace WMS.Domain.Entities;
    public class Warehouse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        
        public ICollection<User> Users { get; set; } = new List<User>();
    }