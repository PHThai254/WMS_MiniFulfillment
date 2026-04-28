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
                response.Message = exception.Message;
                break;

            // Lỗi phân quyền (Authorization)
            case InvalidOperationException when exception.Message.Contains("role", StringComparison.OrdinalIgnoreCase):
                context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
                response.Message = exception.Message;
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

        // Ghi log lỗi thông minh hơn
        LogException(exception, context);

        return context.Response.WriteAsJsonAsync(response);
    }

    private static void LogException(Exception exception, HttpContext context)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<GlobalExceptionMiddleware>>();
        var statusCode = context.Response.StatusCode;

        // Nếu là lỗi 4xx (Lỗi từ phía người dùng / Lỗi nghiệp vụ) -> Chỉ log Warning cho sạch màn hình
        if (statusCode >= 400 && statusCode < 500)
        {
            logger.LogWarning("⚠️ Lỗi nghiệp vụ [{StatusCode}] tại {Method} {Path}: {Message}",
                statusCode,
                context.Request.Method,
                context.Request.Path,
                exception.Message);
        }
        // Nếu là lỗi 5xx (Lỗi hỏng hóc hệ thống thật sự) -> Log Error đỏ lòm kèm StackTrace để dev debug
        else
        {
            var errorDetails = new
            {
                Timestamp = DateTime.UtcNow,
                Method = context.Request.Method,
                Path = context.Request.Path,
                QueryString = context.Request.QueryString,
                StatusCode = statusCode,
                ExceptionType = exception.GetType().Name,
                Message = exception.Message,
                StackTrace = exception.StackTrace // Giữ lại StackTrace để đi tìm bug
            };

            logger.LogError(exception, "❌ Lỗi hệ thống nghiêm trọng: {@ErrorDetails}", errorDetails);
        }
    }
}