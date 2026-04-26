namespace WMS.Application.DTOs.Auth;

/// <summary>
/// DTO nhận yêu cầu cấp lại token từ client.
/// </summary>
public record RefreshTokenRequest(string AccessToken, string RefreshToken);