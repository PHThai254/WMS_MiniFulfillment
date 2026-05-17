using System.Threading.Tasks;
using WMS.Application.DTOs;

namespace WMS.Application.Interfaces
{
    public interface IOcrProcessingService
    {
        Task<ReceiptOcrDto> ProcessInvoiceImageAsync(string base64Image);
    }
}
