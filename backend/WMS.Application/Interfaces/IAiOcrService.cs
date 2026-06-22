using System.Threading.Tasks;

namespace WMS.Application.Interfaces
{
    public interface IAiOcrService
    {
        Task<string> ExtractInvoiceDataAsync(string base64Image, string mimeType);
    }
}
