using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WMS.Application.DTOs.Operations;
using WMS.Application.Interfaces;
using WMS.Application.Wrappers;
using WMS.Infrastructure.Data;

namespace WMS.API.Controllers;

[ApiController]
[Route("api/Receipts")]
[Authorize]
public class ReceiptsController : ControllerBase
{
    private readonly IReceiptService _service;
    private readonly ICompletionCheckService _completionCheckService;
    private readonly ICurrentUserContext _currentUser;
    private readonly ApplicationDbContext _dbContext;

    public ReceiptsController(
        IReceiptService service,
        ICompletionCheckService completionCheckService,
        ICurrentUserContext currentUser,
        ApplicationDbContext dbContext)
    {
        _service = service;
        _completionCheckService = completionCheckService;
        _currentUser = currentUser;
        _dbContext = dbContext;
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
    [Authorize(Policy = "create_receipt")]
    public async Task<ActionResult<ApiResponse<ReceiptDto>>> Create([FromBody] CreateReceiptRequest request)
    {
        var createdBy = _currentUser.GetCurrentUserId() ?? "system";
        var data = await _service.CreateAsync(request, createdBy);
        return Ok(ApiResponse<ReceiptDto>.Succeeded(data, "Tạo phiếu nhập thành công."));
    }

    [HttpPost("{id:guid}/approve-qc")]
    [Authorize(Policy = "approve_qc_receipt")]
    public async Task<ActionResult<ApiResponse<ReceiptDto>>> ApproveQc(Guid id, [FromBody] ApproveReceiptRequest request)
    {
        var data = await _service.ApproveQcAsync(id, request);
        return Ok(ApiResponse<ReceiptDto>.Succeeded(data, "Duyệt QC thành công."));
    }

    [HttpPost("{id:guid}/approve-ocr")]
    [Authorize(Policy = "approve_ocr_receipt")]
    public async Task<ActionResult<ApiResponse<ReceiptDto>>> ApproveOcr(Guid id, [FromBody] ApproveOcrRequest request)
    {
        var data = await _service.ApproveOcrAsync(id, request);
        return Ok(ApiResponse<ReceiptDto>.Succeeded(data, "Lưu kết quả OCR và duyệt phiếu thành công."));
    }

    [HttpPost("{id:guid}/complete-putaway")]
    [Authorize(Policy = "complete_putaway")]
    public async Task<ActionResult<ApiResponse<ReceiptDto>>> CompletePutAway(Guid id)
    {
        try
        {
            var data = await _service.CompletePutAwayAsync(id);
            return Ok(ApiResponse<ReceiptDto>.Succeeded(data, "Hoàn thành cất hàng. Tồn kho đã được cập nhật."));
        }
        catch (DbUpdateConcurrencyException)
        {
            // Tồn kho bị thay đổi bởi người dùng khác - xung đột concurrency
            return Conflict(ApiResponse<ReceiptDto>.Failed(
                "Tồn kho đã được thay đổi bởi người dùng khác. Vui lòng tải lại dữ liệu và thử lại."));
        }
    }

    /// <summary>
    /// Lưu Receipt sau khi QA/QC duyệt/sửa dữ liệu OCR
    /// Luồng: Upload ảnh -> OCR Gemini -> QA/QC duyệt -> Lưu Receipt
    /// Chọn Policy "approve_qc" vì đây là hành động chốt kết quả QA
    /// </summary>
    [HttpPost("save-from-ocr")]
    [Authorize(Policy = "approve_qc")]
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
    [Authorize(Policy = "run_ocr")]
    public async Task<ActionResult<ApiResponse<OcrResultDto>>> RunOcr(IFormFile image)
    {
        if (image is null || image.Length == 0)
            return BadRequest(ApiResponse<OcrResultDto>.Failed("Vui lòng tải lên ảnh hóa đơn."));

        using var stream = image.OpenReadStream();
        var result = await _service.RunOcrAsync(stream, image.FileName);
        return Ok(ApiResponse<OcrResultDto>.Succeeded(result, "OCR hoàn thành."));
    }

    /// <summary>
    /// Kiểm tra và tự động chuyển Receipt sang Completed nếu đủ hàng
    /// (Thường được gọi tự động, nhưng có thể gọi manual nếu cần)
    /// </summary>
    [HttpPost("{id:guid}/check-completion")]
    [Authorize(Policy = "complete_putaway")]
    public async Task<ActionResult<ApiResponse<object>>> CheckCompletion(Guid id)
    {
        try
        {
            var isCompleted = await _completionCheckService.CheckAndCompleteReceiptAsync(id);
            var message = isCompleted
                ? "Phiếu nhập đã chuyển sang Completed."
                : "Phiếu nhập chưa đủ điều kiện để hoàn thành.";
            return Ok(ApiResponse<object>.Succeeded(new { completed = isCompleted }, message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Failed(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Failed(ex.Message));
        }
    }
}

[ApiController]
[Route("api/Issues")]
[Authorize]
public class IssuesController : ControllerBase
{
    private readonly IIssueService _service;
    private readonly ICompletionCheckService _completionCheckService;
    private readonly ICurrentUserContext _currentUser;
    private readonly ApplicationDbContext _dbContext;

    public IssuesController(
        IIssueService service,
        ICompletionCheckService completionCheckService,
        ICurrentUserContext currentUser,
        ApplicationDbContext dbContext)
    {
        _service = service;
        _completionCheckService = completionCheckService;
        _currentUser = currentUser;
        _dbContext = dbContext;
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
    [Authorize(Policy = "create_issue")]
    public async Task<ActionResult<ApiResponse<IssueDto>>> Create([FromBody] CreateIssueRequest request)
    {
        var createdBy = _currentUser.GetCurrentUserId() ?? "system";
        var data = await _service.CreateAsync(request, createdBy);
        return Ok(ApiResponse<IssueDto>.Succeeded(data, "Tạo lệnh xuất kho thành công."));
    }

    [HttpGet("{id:guid}/picking-plan")]
    [Authorize(Policy = "get_picking_plan")]
    public async Task<ActionResult<ApiResponse<PickingPlanDto>>> GetPickingPlan(Guid id)
    {
        var data = await _service.GeneratePickingPlanAsync(id);
        return Ok(ApiResponse<PickingPlanDto>.Succeeded(data, "Lộ trình nhặt hàng FIFO đã được tạo."));
    }

    [HttpPost("{id:guid}/confirm-pick")]
    [Authorize(Policy = "confirm_pick")]
    public async Task<ActionResult<ApiResponse<IssueDto>>> ConfirmPick(Guid id, [FromBody] ConfirmPickRequest request)
    {
        try
        {
            var data = await _service.ConfirmPickAsync(id, request);
            return Ok(ApiResponse<IssueDto>.Succeeded(data, "Xác nhận nhặt hàng thành công."));
        }
        catch (DbUpdateConcurrencyException)
        {
            // Tồn kho bị thay đổi bởi người dùng khác - xung đột concurrency
            return Conflict(ApiResponse<IssueDto>.Failed(
                "Tồn kho đã được thay đổi bởi người dùng khác. Vui lòng tải lại dữ liệu và thử lại."));
        }
    }

    /// <summary>
    /// [POST] api/Issues/{id}/confirm-picking-batch
    /// Xác nhận số lượng thực lấy cho TOÀN BỘ phiếu xuất trong 1 lần gọi (batch confirm).
    ///
    /// Request Body: ConfirmPickingRequestDto
    ///   - IssueId: Guid (phải khớp với {id} trên URL)
    ///   - PickedItems: [ { ProductId, ActualQuantity }, ... ]
    ///
    /// HTTP Status:
    ///   200 OK         → Tất cả hàng đã xác nhận thành công, tồn kho đã trừ an toàn.
    ///   400 BadRequest → Lỗi nghiệp vụ: âm kho, sai trạng thái, input không hợp lệ.
    ///   404 NotFound   → Không tìm thấy phiếu xuất.
    ///   409 Conflict   → Xung đột concurrency (RowVersion thay đổi giữa chừng).
    ///   500 Internal   → Lỗi hệ thống không mong muốn.
    /// </summary>
    [HttpPost("{id:guid}/confirm-picking-batch")]
    [Authorize(Policy = "confirm_pick")]
    public async Task<ActionResult<ApiResponse<IssueDto>>> ConfirmPickingBatch(
        Guid id,
        [FromBody] ConfirmPickingRequestDto request)
    {
        // Guard: IssueId trong body phải khớp với {id} trên URL để tránh nhầm lẫn
        if (request.IssueId != id)
            return BadRequest(ApiResponse<IssueDto>.Failed(
                $"IssueId trong body ({request.IssueId}) không khớp với Id trên URL ({id})."));

        try
        {
            var data = await _service.ConfirmPickingBatchAsync(request);
            return Ok(ApiResponse<IssueDto>.Succeeded(data,
                "Xác nhận nhặt hàng thành công. Tồn kho đã được trừ an toàn."));
        }
        catch (KeyNotFoundException ex)
        {
            // 404: Phiếu xuất không tồn tại
            return NotFound(ApiResponse<IssueDto>.Failed(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            // 400: Lỗi nghiệp vụ - tồn kho không đủ hoặc sai trạng thái phiếu
            return BadRequest(ApiResponse<IssueDto>.Failed(ex.Message));
        }
        catch (ArgumentException ex)
        {
            // 400: Dữ liệu đầu vào không hợp lệ (ProductId không có trong phiếu, trùng lặp, ...)
            return BadRequest(ApiResponse<IssueDto>.Failed(ex.Message));
        }
        catch (DbUpdateConcurrencyException)
        {
            // 409: Xung đột concurrency - RowVersion của Inventory thay đổi giữa chừng
            return Conflict(ApiResponse<IssueDto>.Failed(
                "Tồn kho đã được thay đổi bởi tiến trình khác trong khi xử lý. " +
                "Giao dịch đã được hủy bỏ. Vui lòng tải lại dữ liệu và thử lại."));
        }
        catch (Exception ex)
        {
            // 500: Lỗi hệ thống không mong muốn
            return StatusCode(500, ApiResponse<IssueDto>.Failed(
                $"Lỗi hệ thống khi xác nhận nhặt hàng: {ex.Message}"));
        }
    }

    [HttpPost("{id:guid}/handover")]
    [Authorize(Policy = "handover_issue")]
    public async Task<ActionResult<ApiResponse<IssueDto>>> Handover(Guid id)
    {
        try
        {
            var data = await _service.HandoverAsync(id);
            return Ok(ApiResponse<IssueDto>.Succeeded(data, "Bàn giao vận chuyển thành công."));
        }
        catch (DbUpdateConcurrencyException)
        {
            // Xử lý lỗi khi có người khác vừa tác động vào dữ liệu cùng lúc
            return Conflict(ApiResponse<IssueDto>.Failed("Dữ liệu tồn kho hoặc phiếu đã bị thay đổi bởi người khác. Vui lòng tải lại và thử lại."));
        }
        catch (Exception ex)
        {
            // Bắt thêm lỗi hệ thống
            return StatusCode(500, ApiResponse<IssueDto>.Failed("Lỗi hệ thống khi bàn giao: " + ex.Message));
        }
    } 

    /// <summary>
    /// Kiểm tra và tự động chuyển Issue sang Handover nếu tất cả hàng đã pick đủ
    /// (Thường được gọi tự động, nhưng có thể gọi manual nếu cần)
    /// </summary>
    [HttpPost("{id:guid}/check-completion")]
    [Authorize(Policy = "confirm_pick")]
        
    public async Task<ActionResult<ApiResponse<object>>> CheckCompletion(Guid id)
    {
        try
        {
            var isCompleted = await _completionCheckService.CheckAndCompleteIssueAsync(id);
            var message = isCompleted
                ? "Phiếu xuất đã chuyển sang Handover."
                : "Phiếu xuất chưa đủ điều kiện để hoàn thành (chưa pick hết hàng).";
            return Ok(ApiResponse<object>.Succeeded(new { completed = isCompleted }, message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Failed(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Failed(ex.Message));
        }
    }
}
[ApiController]
[Route("api/Inventory")]
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
    [Authorize(Policy = "adjust_inventory")]
    public async Task<ActionResult<ApiResponse<object>>> Adjust([FromBody] WMS.Application.DTOs.Inventory.AdjustInventoryRequest request)
    {
        var adjustedBy = _currentUser.GetCurrentUserId() ?? "system";
        await _service.AdjustAsync(request, adjustedBy);
        return Ok(ApiResponse<object>.Succeeded(null!, "Điều chỉnh tồn kho thành công."));
    }
}

[ApiController]
[Route("api/Analytics")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _service;
    public AnalyticsController(IAnalyticsService service) => _service = service;

    // FIX BUG 2: Đổi từ [Authorize(Policy = "view_analytics")] sang [Authorize(Policy = "view_dashboard_kpi")]
    // Policy "view_dashboard_kpi" được đăng ký trong Program.cs và gán cho cả Admin lẫn QA_QC trong DB
    // Tuyệt đối không dùng [Authorize(Roles = "Admin")] để tránh hardcode vai trò
    [HttpGet("kpis")]
    [Authorize(Policy = "view_dashboard_kpi")]
    public async Task<ActionResult<ApiResponse<WMS.Application.DTOs.Analytics.DashboardKpiDto>>> GetKpis()
        => Ok(ApiResponse<WMS.Application.DTOs.Analytics.DashboardKpiDto>.Succeeded(await _service.GetKpiAsync()));

    [HttpGet("low-stock")]
    [Authorize(Policy = "view_dashboard_kpi")]
    public async Task<ActionResult<ApiResponse<List<WMS.Application.DTOs.Analytics.LowStockProductDto>>>> GetLowStock([FromQuery] int top = 5)
        => Ok(ApiResponse<List<WMS.Application.DTOs.Analytics.LowStockProductDto>>.Succeeded(await _service.GetLowStockProductsAsync(top)));

    [HttpGet("stock-movements")]
    [Authorize(Policy = "view_dashboard_kpi")]
    public async Task<ActionResult<ApiResponse<List<WMS.Application.DTOs.Analytics.StockMovementDto>>>> GetStockMovements([FromQuery] int days = 7)
        => Ok(ApiResponse<List<WMS.Application.DTOs.Analytics.StockMovementDto>>.Succeeded(await _service.GetStockMovementsAsync(days)));
}

[ApiController]
[Route("api/Users")]
[Authorize(Policy = "manage_users")]
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
