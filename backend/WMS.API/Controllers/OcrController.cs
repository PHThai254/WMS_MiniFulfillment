using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Threading.Tasks;
using WMS.Application.Interfaces;
using WMS.Application.Wrappers;
using WMS.Domain.Exceptions;

namespace WMS.API.Controllers;

/// <summary>
/// OCR Controller - Xử lý Upload ảnh hóa đơn và gửi lên Gemini API
/// Luồng: Upload ảnh -> Gemini OCR -> Trả về JSON chờ duyệt QA/QC
/// </summary>
[ApiController]
[Route("api/Ocr")]
// ĐÃ SỬA: Đổi từ gán cứng Role sang dùng Policy phân quyền động
[Authorize(Policy = "run_ocr")] 
public class OcrController : ControllerBase
{
    private readonly IOcrProcessingService _ocrProcessingService;
    private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5MB

    public OcrController(IOcrProcessingService ocrProcessingService)
    {
        _ocrProcessingService = ocrProcessingService;
    }

    /// <summary>
    /// Upload ảnh hóa đơn và xử lý OCR via Gemini API
    /// </summary>
    /// <param name="image">File ảnh hóa đơn (JPEG, PNG, GIF, WebP)</param>
    /// <returns>ReceiptOcrDto chứa dữ liệu OCR và danh sách field nghi ngờ</returns>
    [HttpPost("extract")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ExtractInvoice(IFormFile image)
    {
        if (image == null || image.Length == 0)
        {
            return BadRequest(ApiResponse<object>.Failed("Dữ liệu ảnh không hợp lệ"));
        }

        // Kiểm tra kích thước file
        if (image.Length > MaxFileSizeBytes)
        {
            return BadRequest(ApiResponse<object>.Failed($"Kích thước file vượt quá {MaxFileSizeBytes / (1024 * 1024)}MB"));
        }

        // Kiểm tra định dạng file
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var fileExtension = Path.GetExtension(image.FileName).ToLower();
        if (!Array.Exists(allowedExtensions, ext => ext == fileExtension))
        {
            return BadRequest(ApiResponse<object>.Failed($"Định dạng file không được hỗ trợ. Hỗ trợ: {string.Join(", ", allowedExtensions)}"));
        }

        try
        {
            using var memoryStream = new MemoryStream();
            await image.CopyToAsync(memoryStream);
            byte[] imageBytes = memoryStream.ToArray();
            string base64String = Convert.ToBase64String(imageBytes);

            // ĐÃ SỬA: Truyền thêm thuộc tính image.ContentType (VD: "image/png") xuống tầng dưới
            var result = await _ocrProcessingService.ProcessInvoiceImageAsync(base64String, image.ContentType);
            
            return Ok(ApiResponse<object>.Succeeded(result, "Xử lý OCR thành công"));
        }
        catch (OcrParsingException ex)
        {
            return BadRequest(ApiResponse<object>.Failed(ex.Message));
        }
        catch (ApplicationException ex)
        {
            return StatusCode(500, ApiResponse<object>.Failed("Lỗi gọi Gemini API: " + ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Failed("Lỗi hệ thống trong quá trình xử lý OCR: " + ex.Message));
        }
    }
}