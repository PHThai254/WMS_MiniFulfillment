using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace WMS.Application.DTOs
{
    public class ReceiptOcrDto
    {
        [JsonPropertyName("supplierName")]
        public string? SupplierName { get; set; }

        [JsonPropertyName("invoiceDate")]
        public DateTime? InvoiceDate { get; set; }

        [JsonPropertyName("items")]
        public List<OcrItemDto> Items { get; set; } = new List<OcrItemDto>();
    }

    public class OcrItemDto
    {
        [JsonPropertyName("productName")]
        public string? ProductName { get; set; }

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [JsonPropertyName("unitPrice")]
        public decimal UnitPrice { get; set; }
    }
}
