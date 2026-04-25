using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WMS.Application.Wrappers;

namespace WMS.API.Middlewares;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        
        var response = new ApiResponse<object>();
        
        // Xác định loại lỗi
        switch (exception)
        {
            // Lỗi xác thực (Authentication)
            case UnauthorizedAccessException:
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                response.Message = "Không có quyền truy cập (Unauthorized)";
                break;

            // Lỗi phân quyền (Authorization)
            case InvalidOperationException when exception.Message.Contains("role", StringComparison.OrdinalIgnoreCase):
                context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
                response.Message = "Bạn không có quyền thực hiện hành động này (Forbidden)";
                break;

            // Lỗi nghiệp vụ (Validation/Business Logic)
            case ArgumentNullException or ArgumentException:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                response.Message = exception.Message;
                break;

            // Lỗi không tìm thấy
            case KeyNotFoundException:
                context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                response.Message = "Không tìm thấy dữ liệu được yêu cầu";
                break;

            // Lỗi Concurrency (Race Condition)
            case DbUpdateConcurrencyException:
                context.Response.StatusCode = (int)HttpStatusCode.Conflict;
                response.Message = "Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại dữ liệu";
                break;

            // Lỗi hệ thống mặc định
            default:
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                response.Message = "Lỗi hệ thống nội bộ";
                break;
        }

        response.Success = false;

        // Ghi log lỗi
        LogException(exception, context);

        return context.Response.WriteAsJsonAsync(response);
    }

    private static void LogException(Exception exception, HttpContext context)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<GlobalExceptionMiddleware>>();
        
        var errorDetails = new
        {
            Timestamp = DateTime.UtcNow,
            Method = context.Request.Method,
            Path = context.Request.Path,
            QueryString = context.Request.QueryString,
            StatusCode = context.Response.StatusCode,
            ExceptionType = exception.GetType().Name,
            Message = exception.Message,
            StackTrace = exception.StackTrace
        };

        logger.LogError("Exception: {@ErrorDetails}", errorDetails);
    }
}
