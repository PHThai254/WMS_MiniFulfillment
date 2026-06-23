namespace WMS.Domain.Enums;

/// <summary>
/// Trạng thái vòng đời của phiếu xuất kho:
///   Pending  → Phiếu mới tạo, chờ lập kế hoạch nhặt hàng.
///   Picking  → Đã có Picking Plan, nhân viên đang nhặt hàng.
///   Picked   → Toàn bộ hàng đã nhặt đủ, chờ bàn giao vận chuyển.
///   Handover → Đã bàn giao cho bộ phận vận chuyển, kết thúc quy trình.
/// </summary>
public enum IssueStatus { Pending, Picking, Picked, Handover }