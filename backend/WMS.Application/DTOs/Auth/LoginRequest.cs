namespace WMS.Application.DTOs.Auth;

/// <summary>
/// DTO nhận thông tin đăng nhập từ client.
/// </summary>
public record LoginRequest(string Username, string Password);