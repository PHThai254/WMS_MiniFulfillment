using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace WMS.Application.DTOs
{
    /// <summary>
    /// DTO cho kết quả OCR từ Gemini API - dữ liệu chờ duyệt từ QA/QC
    /// </summary>
    public class ReceiptOcrDto
    {
        [JsonPropertyName("supplierName")]
        public string? SupplierName { get; set; }

        [JsonPropertyName("supplierNameConfidence")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public double? SupplierNameConfidence { get; set; }

        [JsonPropertyName("invoiceDate")]
        public DateTime? InvoiceDate { get; set; }

        [JsonPropertyName("invoiceDateConfidence")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public double? InvoiceDateConfidence { get; set; }

        [JsonPropertyName("items")]
        public List<OcrItemDto> Items { get; set; } = new List<OcrItemDto>();

        /// <summary>
        /// Chứa danh sách các field mà AI báo nghi ngờ (confidence < 0.7)
        /// </summary>
        [JsonPropertyName("suspiciousFields")]
        public List<string> SuspiciousFields { get; set; } = new List<string>();
    }

    /// <summary>
    /// DTO cho từng item trong hóa đơn
    /// </summary>
    public class OcrItemDto
    {
        [JsonPropertyName("productName")]
        public string? ProductName { get; set; }

        [JsonPropertyName("productNameConfidence")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public double? ProductNameConfidence { get; set; }

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [JsonPropertyName("quantityConfidence")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public double? QuantityConfidence { get; set; }

        [JsonPropertyName("unitPrice")]
        public decimal UnitPrice { get; set; }

        [JsonPropertyName("unitPriceConfidence")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public double? UnitPriceConfidence { get; set; }
    }
}
