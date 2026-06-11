namespace WMS.Domain.Entities;

public class Supplier
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;   // Max 200
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }

    // Navigation
    public ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();
}