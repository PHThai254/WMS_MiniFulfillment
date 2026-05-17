using System;
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

        public OcrProcessingService(IAiOcrService aiOcrService)
        {
            _aiOcrService = aiOcrService;
        }

        public async Task<ReceiptOcrDto> ProcessInvoiceImageAsync(string base64Image)
        {
            string jsonResult = await _aiOcrService.ExtractInvoiceDataAsync(base64Image);

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
                return result;
            }
            catch (JsonException)
            {
                throw new OcrParsingException("Không thể đọc dữ liệu hóa đơn, vui lòng chụp lại ảnh rỏ nét hơn");
            }
        }
    }
}
