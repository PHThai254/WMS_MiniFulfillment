namespace WMS.Domain.Entities;
public class Role {
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty; // Admin, QA_QC, Staff
    public string Description { get; set; } = string.Empty;
    public ICollection<User> Users { get; set; } = new List<User>();
}