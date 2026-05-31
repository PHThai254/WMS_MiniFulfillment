using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WMS.Application.DTOs.Operations;
using WMS.Application.Interfaces;
using WMS.Application.Wrappers;

namespace WMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReceiptsController : ControllerBase
{
    private readonly IReceiptService _service;
    private readonly ICurrentUserContext _currentUser;

    public ReceiptsController(IReceiptService service, ICurrentUserContext currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ReceiptDto>>>> GetAll()
    {
        var data = await _service.GetAllAsync();
        return Ok(ApiResponse<List<ReceiptDto>>.Succeeded(data));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ReceiptDto>>> GetById(Guid id)
    {
        var data = await _service.GetByIdAsync(id);
        if (data is null) return NotFound(ApiResponse<ReceiptDto>.Failed("Không tìm thấy phiếu nhập."));
        return Ok(ApiResponse<ReceiptDto>.Succeeded(data));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<ReceiptDto>>> Create([FromBody] CreateReceiptRequest request)
    {
        var createdBy = _currentUser.GetCurrentUserId() ?? "system";
        var data = await _service.CreateAsync(request, createdBy);
        return Ok(ApiResponse<ReceiptDto>.Succeeded(data, "Tạo phiếu nhập thành công."));
    }

    [HttpPost("{id:guid}/approve-qc")]
    [Authorize(Roles = "QA_QC,Admin")]
    public async Task<ActionResult<ApiResponse<ReceiptDto>>> ApproveQc(Guid id, [FromBody] ApproveReceiptRequest request)
    {
        var data = await _service.ApproveQcAsync(id, request);
        return Ok(ApiResponse<ReceiptDto>.Succeeded(data, "Duyệt QC thành công."));
    }

    [HttpPost("{id:guid}/approve-ocr")]
    [Authorize(Roles = "QA_QC,Admin")]
    public async Task<ActionResult<ApiResponse<ReceiptDto>>> ApproveOcr(Guid id, [FromBody] ApproveOcrRequest request)
    {
        var data = await _service.ApproveOcrAsync(id, request);
        return Ok(ApiResponse<ReceiptDto>.Succeeded(data, "Lưu kết quả OCR và duyệt phiếu thành công."));
    }

    [HttpPost("{id:guid}/complete-putaway")]
    [Authorize(Roles = "Staff,Admin")]
    public async Task<ActionResult<ApiResponse<ReceiptDto>>> CompletePutAway(Guid id)
    {
        var data = await _service.CompletePutAwayAsync(id);
        return Ok(ApiResponse<ReceiptDto>.Succeeded(data, "Hoàn thành cất hàng. Tồn kho đã được cập nhật."));
    }

    /// <summary>
    /// Lưu Receipt sau khi QA/QC duyệt/sửa dữ liệu OCR
    /// Luồng: Upload ảnh -> OCR Gemini -> QA/QC duyệt -> Lưu Receipt
    /// </summary>
    [HttpPost("save-from-ocr")]
    [Authorize(Roles = "QA_QC,Admin")]
    public async Task<ActionResult<ApiResponse<object>>> SaveFromOcr([FromBody] SaveOcrReceiptRequest request)
    {
        try
        {
            var createdBy = _currentUser.GetCurrentUserId() ?? "system";
            var receiptId = await _service.SaveReceiptFromOcrAsync(request, createdBy);
            return Ok(ApiResponse<object>.Succeeded(new { id = receiptId }, "Lưu phiếu nhập từ OCR thành công"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.Failed($"Lỗi lưu phiếu nhập: {ex.Message}"));
        }
    }

    [HttpPost("ocr")]
    [Authorize(Roles = "QA_QC,Admin")]
    public async Task<ActionResult<ApiResponse<OcrResultDto>>> RunOcr(IFormFile image)
    {
        if (image is null || image.Length == 0)
            return BadRequest(ApiResponse<OcrResultDto>.Failed("Vui lòng tải lên ảnh hóa đơn."));

        using var stream = image.OpenReadStream();
        var result = await _service.RunOcrAsync(stream, image.FileName);
        return Ok(ApiResponse<OcrResultDto>.Succeeded(result, "OCR hoàn thành."));
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class IssuesController : ControllerBase
{
    private readonly IIssueService _service;
    private readonly ICurrentUserContext _currentUser;

    public IssuesController(IIssueService service, ICurrentUserContext currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<IssueDto>>>> GetAll()
    {
        var data = await _service.GetAllAsync();
        return Ok(ApiResponse<List<IssueDto>>.Succeeded(data));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<IssueDto>>> GetById(Guid id)
    {
        var data = await _service.GetByIdAsync(id);
        if (data is null) return NotFound(ApiResponse<IssueDto>.Failed("Không tìm thấy phiếu xuất."));
        return Ok(ApiResponse<IssueDto>.Succeeded(data));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<IssueDto>>> Create([FromBody] CreateIssueRequest request)
    {
        var createdBy = _currentUser.GetCurrentUserId() ?? "system";
        var data = await _service.CreateAsync(request, createdBy);
        return Ok(ApiResponse<IssueDto>.Succeeded(data, "Tạo lệnh xuất kho thành công."));
    }

    [HttpGet("{id:guid}/picking-plan")]
    [Authorize(Roles = "Staff,Admin")]
    public async Task<ActionResult<ApiResponse<PickingPlanDto>>> GetPickingPlan(Guid id)
    {
        var data = await _service.GeneratePickingPlanAsync(id);
        return Ok(ApiResponse<PickingPlanDto>.Succeeded(data, "Lộ trình nhặt hàng FIFO đã được tạo."));
    }

    [HttpPost("{id:guid}/confirm-pick")]
    [Authorize(Roles = "Staff,Admin")]
    public async Task<ActionResult<ApiResponse<IssueDto>>> ConfirmPick(Guid id, [FromBody] ConfirmPickRequest request)
    {
        var data = await _service.ConfirmPickAsync(id, request);
        return Ok(ApiResponse<IssueDto>.Succeeded(data, "Xác nhận nhặt hàng thành công."));
    }

    [HttpPost("{id:guid}/handover")]
    [Authorize(Roles = "Staff,Admin")]
    public async Task<ActionResult<ApiResponse<IssueDto>>> Handover(Guid id)
    {
        var data = await _service.HandoverAsync(id);
        return Ok(ApiResponse<IssueDto>.Succeeded(data, "Bàn giao vận chuyển thành công."));
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _service;
    private readonly ICurrentUserContext _currentUser;

    public InventoryController(IInventoryService service, ICurrentUserContext currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<WMS.Application.DTOs.Inventory.InventoryDto>>>> GetAll(
        [FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 20, [FromQuery] Guid? warehouseId = null, [FromQuery] Guid? zoneId = null)
    {
        var data = await _service.GetAllAsync(pageIndex, pageSize, warehouseId, zoneId);
        return Ok(ApiResponse<PagedResult<WMS.Application.DTOs.Inventory.InventoryDto>>.Succeeded(data));
    }

    [HttpGet("stock-summary")]
    public async Task<ActionResult<ApiResponse<List<WMS.Application.DTOs.Inventory.StockSummaryDto>>>> GetStockSummary()
    {
        var data = await _service.GetStockSummaryAsync();
        return Ok(ApiResponse<List<WMS.Application.DTOs.Inventory.StockSummaryDto>>.Succeeded(data));
    }

    [HttpGet("transactions")]
    public async Task<ActionResult<ApiResponse<PagedResult<WMS.Application.DTOs.Inventory.InventoryTransactionDto>>>> GetTransactions(
        [FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 50)
    {
        var data = await _service.GetTransactionsAsync(pageIndex, pageSize);
        return Ok(ApiResponse<PagedResult<WMS.Application.DTOs.Inventory.InventoryTransactionDto>>.Succeeded(data));
    }

    [HttpPost("adjust")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> Adjust([FromBody] WMS.Application.DTOs.Inventory.AdjustInventoryRequest request)
    {
        var adjustedBy = _currentUser.GetCurrentUserId() ?? "system";
        await _service.AdjustAsync(request, adjustedBy);
        return Ok(ApiResponse<object>.Succeeded(null!, "Điều chỉnh tồn kho thành công."));
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _service;
    public AnalyticsController(IAnalyticsService service) => _service = service;

    [HttpGet("kpis")]
    public async Task<ActionResult<ApiResponse<WMS.Application.DTOs.Analytics.DashboardKpiDto>>> GetKpis()
        => Ok(ApiResponse<WMS.Application.DTOs.Analytics.DashboardKpiDto>.Succeeded(await _service.GetKpiAsync()));

    [HttpGet("low-stock")]
    public async Task<ActionResult<ApiResponse<List<WMS.Application.DTOs.Analytics.LowStockProductDto>>>> GetLowStock([FromQuery] int top = 5)
        => Ok(ApiResponse<List<WMS.Application.DTOs.Analytics.LowStockProductDto>>.Succeeded(await _service.GetLowStockProductsAsync(top)));

    [HttpGet("stock-movements")]
    public async Task<ActionResult<ApiResponse<List<WMS.Application.DTOs.Analytics.StockMovementDto>>>> GetStockMovements([FromQuery] int days = 7)
        => Ok(ApiResponse<List<WMS.Application.DTOs.Analytics.StockMovementDto>>.Succeeded(await _service.GetStockMovementsAsync(days)));
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly IUserManagementService _service;
    public UsersController(IUserManagementService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<WMS.Application.DTOs.UserManagement.UserDto>>>> GetAll()
        => Ok(ApiResponse<List<WMS.Application.DTOs.UserManagement.UserDto>>.Succeeded(await _service.GetAllAsync()));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<WMS.Application.DTOs.UserManagement.UserDto>>> GetById(Guid id)
    {
        var data = await _service.GetByIdAsync(id);
        if (data is null) return NotFound(ApiResponse<WMS.Application.DTOs.UserManagement.UserDto>.Failed("Không tìm thấy người dùng."));
        return Ok(ApiResponse<WMS.Application.DTOs.UserManagement.UserDto>.Succeeded(data));
    }

    [HttpGet("roles")]
    public async Task<ActionResult<ApiResponse<List<WMS.Application.DTOs.UserManagement.RoleDto>>>> GetRoles()
        => Ok(ApiResponse<List<WMS.Application.DTOs.UserManagement.RoleDto>>.Succeeded(await _service.GetRolesAsync()));

    [HttpPost]
    public async Task<ActionResult<ApiResponse<WMS.Application.DTOs.UserManagement.UserDto>>> Create([FromBody] WMS.Application.DTOs.UserManagement.CreateUserRequest request)
    {
        var data = await _service.CreateAsync(request);
        return Ok(ApiResponse<WMS.Application.DTOs.UserManagement.UserDto>.Succeeded(data, "Tạo người dùng thành công."));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<WMS.Application.DTOs.UserManagement.UserDto>>> Update(Guid id, [FromBody] WMS.Application.DTOs.UserManagement.UpdateUserRequest request)
    {
        var data = await _service.UpdateAsync(id, request);
        return Ok(ApiResponse<WMS.Application.DTOs.UserManagement.UserDto>.Succeeded(data, "Cập nhật người dùng thành công."));
    }

    [HttpPost("{id:guid}/change-password")]
    public async Task<ActionResult<ApiResponse<object>>> ChangePassword(Guid id, [FromBody] WMS.Application.DTOs.UserManagement.ChangePasswordRequest request)
    {
        await _service.ChangePasswordAsync(id, request.NewPassword);
        return Ok(ApiResponse<object>.Succeeded(null!, "Đổi mật khẩu thành công."));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse<object>.Succeeded(null!, "Xóa người dùng thành công."));
    }
}
