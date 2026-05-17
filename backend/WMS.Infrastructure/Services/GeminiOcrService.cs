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

        public async Task<string> ExtractInvoiceDataAsync(string base64Image)
        {
            var apiKey = _configuration["Gemini:ApiKey"];
            var baseUrl = _configuration["Gemini:BaseUrl"] ?? "https://generativelanguage.googleapis.com";
            
            // Note: Using gemini-1.5-flash as it is recommended for multimodal tasks
            var endpoint = $"{baseUrl}/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";

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
                                text = "Extract data from this invoice image and return a JSON object with the following fields: supplierName (string), invoiceDate (string), and items (an array of objects containing productName (string), quantity (number), and unitPrice (number))."
                            },
                            new
                            {
                                inline_data = new
                                {
                                    // Base64 payload, using a generic image mime type. 
                                    // You can adjust mime_type dynamically if needed.
                                    mime_type = "image/jpeg", 
                                    data = base64Image
                                }
                            }
                        }
                    }
                },
                generationConfig = new
                {
                    responseMimeType = "application/json"
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
