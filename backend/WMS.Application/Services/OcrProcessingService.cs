using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using WMS.Application.DTOs;
using WMS.Application.Interfaces;
using WMS.Domain.Exceptions;

namespace WMS.Application.Services
{
    public class OcrProcessingService : IOcrProcessingService
    {
        private readonly IAiOcrService _aiOcrService;
        private const double SuspiciousConfidenceThreshold = 0.7;

        public OcrProcessingService(IAiOcrService aiOcrService)
        {
            _aiOcrService = aiOcrService;
        }

        public async Task<ReceiptOcrDto> ProcessInvoiceImageAsync(string base64Image, string mimeType)
        {
            string jsonResult = await _aiOcrService.ExtractInvoiceDataAsync(base64Image, mimeType);

            try
            {
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };

                var result = JsonSerializer.Deserialize<ReceiptOcrDto>(jsonResult, options);
                if (result == null)
                {
                    throw new JsonException("Deserialized result is null.");
                }

                // Nếu AI chưa trả về danh sách suspiciousFields, tôi sẽ tính toán từ confidence scores
                if (result.SuspiciousFields == null || result.SuspiciousFields.Count == 0)
                {
                    result.SuspiciousFields = CalculateSuspiciousFields(result);
                }

                return result;
            }
            catch (JsonException ex)
            {
                throw new OcrParsingException("Đình dạng JSON từ Gemini không hợp lệ. Chi tiết: " + ex.Message);
            }
        }

        /// <summary>
        /// Tính toán danh sách các field nghi ngờ dựa trên confidence score
        /// </summary>
        private List<string> CalculateSuspiciousFields(ReceiptOcrDto result)
        {
            var suspiciousFields = new List<string>();

            if (result.SupplierNameConfidence.HasValue && result.SupplierNameConfidence.Value < SuspiciousConfidenceThreshold)
                suspiciousFields.Add("supplierName");

            if (result.InvoiceDateConfidence.HasValue && result.InvoiceDateConfidence.Value < SuspiciousConfidenceThreshold)
                suspiciousFields.Add("invoiceDate");

            // Kiểm tra từng item
            foreach (var (item, index) in result.Items.Select((item, idx) => (item, idx)))
            {
                if (item.ProductNameConfidence.HasValue && item.ProductNameConfidence.Value < SuspiciousConfidenceThreshold)
                    suspiciousFields.Add($"items[{index}].productName");

                if (item.QuantityConfidence.HasValue && item.QuantityConfidence.Value < SuspiciousConfidenceThreshold)
                    suspiciousFields.Add($"items[{index}].quantity");

                if (item.UnitPriceConfidence.HasValue && item.UnitPriceConfidence.Value < SuspiciousConfidenceThreshold)
                    suspiciousFields.Add($"items[{index}].unitPrice");
            }

            return suspiciousFields;
        }
    }
}
