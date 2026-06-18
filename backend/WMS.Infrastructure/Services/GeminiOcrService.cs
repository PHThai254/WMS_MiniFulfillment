using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using WMS.Application.Interfaces;

namespace WMS.Infrastructure.Services
{
    public class GeminiOcrService : IAiOcrService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public GeminiOcrService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

        // BƯỚC 1: Cập nhật hàm để nhận thêm tham số mimeType
        public async Task<string> ExtractInvoiceDataAsync(string base64Image, string mimeType)
        {
            var apiKey = _configuration["Gemini:ApiKey"];
            var baseUrl = _configuration["Gemini:BaseUrl"] ?? "https://generativelanguage.googleapis.com";
            
            // Note: Using gemini-2.5-flash - thế hệ mới nhất hỗ trợ multimodal (vision)
            var endpoint = $"{baseUrl}/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

            var requestPayload = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new
                            {
                                text = @"Extract data from this invoice image and return ONLY a valid JSON object (no markdown or extra text) with the following structure:
{
  ""supplierName"": ""string (supplier/vendor name)"",
  ""supplierNameConfidence"": 0.95 (confidence score 0-1),
  ""invoiceDate"": ""YYYY-MM-DD (invoice date)"",
  ""invoiceDateConfidence"": 0.9,
  ""items"": [
    {
      ""productName"": ""string"",
      ""productNameConfidence"": 0.85,
      ""quantity"": number,
      ""quantityConfidence"": 0.92,
      ""unitPrice"": number,
      ""unitPriceConfidence"": 0.88
    }
  ],
  ""suspiciousFields"": [""field_name""] (fields with confidence < 0.7)
}

IMPORTANT:
- Return ONLY valid JSON, no markdown code blocks or explanations
- Mark fields with confidence < 0.7 in suspiciousFields array
- If uncertain about a field, set confidence < 0.7 and include in suspiciousFields
- Use null for missing data
- Ensure all numbers are valid JSON numbers (not strings)"
                            },
                            new
                            {
                                // FIX: Gemini REST API yêu cầu camelCase: inlineData, mimeType
                                // JsonNamingPolicy.CamelCase KHÔNG chuyển đổi snake_case (inline_data → inline_data, không phải inlineData)
                                inlineData = new
                                {
                                    // BƯỚC 2: Truyền biến mimeType linh hoạt thay vì gán cứng "image/jpeg"
                                    mimeType = mimeType,
                                    data = base64Image
                                }
                            }
                        }
                    }
                },
                generationConfig = new
                {
                    responseMimeType = "application/json",
                    temperature = 0.2f
                }
            };

            var jsonRequest = JsonSerializer.Serialize(requestPayload, new JsonSerializerOptions 
            { 
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
            });
            
            var content = new StringContent(jsonRequest, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(endpoint, content);
            response.EnsureSuccessStatusCode();

            var jsonResponse = await response.Content.ReadAsStringAsync();

            try
            {
                // Parse the JSON response from Gemini
                using var document = JsonDocument.Parse(jsonResponse);
                
                var root = document.RootElement;
                if (root.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
                {
                    var text = candidates[0]
                        .GetProperty("content")
                        .GetProperty("parts")[0]
                        .GetProperty("text")
                        .GetString();
                        
                    return text ?? "{}";
                }
                
                return "{}";
            }
            catch (Exception ex)
            {
                throw new ApplicationException($"Failed to deserialize Gemini API response. Response: {jsonResponse}", ex);
            }
        }
    }
}