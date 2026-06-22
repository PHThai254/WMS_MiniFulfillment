using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace WMS.Application.DTOs.Operations
{
    /// <summary>
    /// Request để QA/QC lưu phiếu nhập sau khi duyệt/sửa dữ liệu OCR
    /// </summary>
    public class SaveOcrReceiptRequest
    {
        /// <summary>
        /// ID nhà cung cấp
        /// </summary>
        [Required(ErrorMessage = "SupplierId là bắt buộc")]
        [JsonPropertyName("supplierId")]
        public Guid SupplierId { get; set; }

        /// <summary>
        /// Ngày hóa đơn (sau khi QA/QC có thể sửa)
        /// </summary>
        [Required(ErrorMessage = "InvoiceDate là bắt buộc")]
        [JsonPropertyName("invoiceDate")]
        public DateTime InvoiceDate { get; set; }

        /// <summary>
        /// Danh sách các item được duyệt/sửa từ OCR
        /// </summary>
        [Required(ErrorMessage = "Items là bắt buộc")]
        [MinLength(1, ErrorMessage = "Phải có ít nhất 1 sản phẩm")]
        [JsonPropertyName("items")]
        public List<SaveOcrReceiptItemRequest> Items { get; set; } = new();

        /// <summary>
        /// Ghi chú từ QA/QC (nếu có)
        /// </summary>
        [JsonPropertyName("notes")]
        public string? Notes { get; set; }
    }

    /// <summary>
    /// Chi tiết từng sản phẩm trong Receipt được duyệt từ OCR
    /// </summary>
    public class SaveOcrReceiptItemRequest
    {
        /// <summary>
        /// ID sản phẩm (QA/QC chọn từ danh mục)
        /// </summary>
        [Required(ErrorMessage = "ProductId là bắt buộc")]
        [JsonPropertyName("productId")]
        public Guid ProductId { get; set; }

        /// <summary>
        /// ID Zone - nơi cần cất hàng (QA/QC chọn từ danh mục)
        /// </summary>
        [Required(ErrorMessage = "ZoneId là bắt buộc")]
        [JsonPropertyName("zoneId")]
        public Guid ZoneId { get; set; }

        /// <summary>
        /// Số lượng AI đọc được từ hóa đơn (ExpectedQuantity)
        /// </summary>
        [Required(ErrorMessage = "ExpectedQuantity là bắt buộc")]
        [Range(0, int.MaxValue, ErrorMessage = "ExpectedQuantity phải >= 0")]
        [JsonPropertyName("expectedQuantity")]
        public int ExpectedQuantity { get; set; }

        /// <summary>
        /// Số lượng thực tế QA/QC đã kiểm đếm và chốt (ActualQuantity)
        /// </summary>
        [Required(ErrorMessage = "ActualQuantity là bắt buộc")]
        [Range(1, int.MaxValue, ErrorMessage = "ActualQuantity phải > 0")]
        [JsonPropertyName("actualQuantity")]
        public int ActualQuantity { get; set; }

        /// <summary>
        /// Giá đơn vị (lấy từ OCR, QA/QC có thể sửa)
        /// </summary>
        [Required(ErrorMessage = "UnitPrice là bắt buộc")]
        [Range(0, 999999999, ErrorMessage = "UnitPrice không hợp lệ")]
        [JsonPropertyName("unitPrice")]
        public decimal UnitPrice { get; set; }
    }
}
