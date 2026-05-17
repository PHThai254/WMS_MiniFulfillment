using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Threading.Tasks;
using WMS.Application.Interfaces;
using WMS.Domain.Exceptions;

namespace WMS.API.Controllers;

[ApiController]
[Route("api/Ocr")]
[Authorize(Roles = "QA_QC, Admin")]
public class OcrController : ControllerBase
{
    private readonly IOcrProcessingService _ocrProcessingService;

    public OcrController(IOcrProcessingService ocrProcessingService)
    {
        _ocrProcessingService = ocrProcessingService;
    }

    [HttpPost("extract")]
    public async Task<IActionResult> ExtractInvoice(IFormFile image)
    {
        if (image == null || image.Length == 0)
        {
            return BadRequest("Dữ liệu ảnh không hợp lệ.");
        }

        try
        {
            using var memoryStream = new MemoryStream();
            await image.CopyToAsync(memoryStream);
            byte[] imageBytes = memoryStream.ToArray();
            string base64String = Convert.ToBase64String(imageBytes);

            var result = await _ocrProcessingService.ProcessInvoiceImageAsync(base64String);
            
            return Ok(result);
        }
        catch (OcrParsingException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception)
        {
            return StatusCode(500, "Lỗi hệ thống trong quá trình xử lý OCR.");
        }
    }
}
