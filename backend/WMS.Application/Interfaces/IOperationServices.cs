using WMS.Application.DTOs.Operations;

namespace WMS.Application.Interfaces;

public interface IReceiptService
{
    Task<List<ReceiptDto>> GetAllAsync();
    Task<ReceiptDto?> GetByIdAsync(Guid id);
    Task<ReceiptDto> CreateAsync(CreateReceiptRequest request, string createdBy);
    Task<ReceiptDto> ApproveQcAsync(Guid id, ApproveReceiptRequest request);
    Task<ReceiptDto> ApproveOcrAsync(Guid id, ApproveOcrRequest request);
    Task<ReceiptDto> CompletePutAwayAsync(Guid id);
    Task<OcrResultDto> RunOcrAsync(Stream imageStream, string fileName);
    
    /// <summary>
    /// Lưu Receipt từ dữ liệu OCR đã được QA/QC duyệt
    /// </summary>
    Task<int> SaveReceiptFromOcrAsync(SaveOcrReceiptRequest request, string createdBy);
}

public interface IIssueService
{
    Task<List<IssueDto>> GetAllAsync();
    Task<IssueDto?> GetByIdAsync(Guid id);
    Task<IssueDto> CreateAsync(CreateIssueRequest request, string createdBy);
    Task<PickingPlanDto> GeneratePickingPlanAsync(Guid issueId);
    Task<IssueDto> ConfirmPickAsync(Guid issueId, ConfirmPickRequest request);
    Task<IssueDto> HandoverAsync(Guid issueId);
}
