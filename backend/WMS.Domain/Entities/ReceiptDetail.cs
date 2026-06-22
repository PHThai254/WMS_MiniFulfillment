namespace WMS.Domain.Entities;

/// <summary>
/// Chi tiết phiếu nhập.
/// UnitPrice được cấu hình decimal(18,2) qua Fluent API.
/// </summary>
public class ReceiptDetail
{
    public Guid Id { get; set; }
    public Guid ReceiptId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? ZoneId { get; set; }
    public int ExpectedQuantity { get; set; }
    public int ActualQuantity { get; set; }
    public decimal UnitPrice { get; set; }  // decimal(18,2) – configured in Fluent API

    // Navigation
    public Receipt? Receipt { get; set; }
    public Product? Product { get; set; }
    public Zone? Zone { get; set; }
}