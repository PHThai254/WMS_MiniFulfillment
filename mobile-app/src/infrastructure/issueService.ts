// mobile-app/src/infrastructure/issueService.ts
// Service layer gọi API phiếu xuất kho (Issues) + lộ trình FIFO (PickingPlan)
// Tuần 7 - Đức Anh: Xây dựng Service tích hợp thuật toán FIFO phía Mobile

import apiClient from '../di/apiClient';
import type {
  ApiResponse,
  IssueDto,
  PickingPlanDto,
  ConfirmPickRequest,
} from './wmsTypes';

const issueService = {
  /**
   * Lấy toàn bộ danh sách lệnh xuất kho.
   * Mobile App lọc status = 'Picking' để hiển thị các task đang chờ thủ kho xử lý.
   */
  getAll: async (): Promise<IssueDto[]> => {
    const response = await apiClient.get<ApiResponse<IssueDto[]>>('/api/issues');
    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Không thể tải danh sách lệnh xuất.');
    }
    return response.data.data ?? [];
  },

  /**
   * Lấy chi tiết 1 lệnh xuất kho theo ID.
   */
  getById: async (id: string): Promise<IssueDto> => {
    const response = await apiClient.get<ApiResponse<IssueDto>>(`/api/issues/${id}`);
    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Không tìm thấy lệnh xuất.');
    }
    return response.data.data;
  },

  /**
   * Lấy lộ trình nhặt hàng theo thuật toán FIFO từ Server.
   * 
   * Server sẽ:
   *   1. Sắp xếp Inventory theo LastRestockedDate ASC (hàng nhập cũ → ưu tiên lấy trước)
   *   2. Phân bổ số lượng từ nhiều Zone nếu 1 Zone không đủ hàng (Split Allocation)
   *   3. Tự động chuyển Issue.Status → Picking khi được gọi lần đầu
   * 
   * API: GET /api/issues/{id}/picking-plan
   * Requires Role: Staff | Admin
   */
  getPickingPlan: async (issueId: string): Promise<PickingPlanDto> => {
    const response = await apiClient.get<ApiResponse<PickingPlanDto>>(
      `/api/issues/${issueId}/picking-plan`
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Không thể tạo lộ trình nhặt hàng.');
    }
    return response.data.data;
  },

  /**
   * Xác nhận đã nhặt xong 1 dòng hàng (IssueDetail).
   * Backend sẽ trừ tồn kho an toàn bằng Transaction + tự động kiểm tra
   * chuyển Issue sang Handover nếu tất cả dòng đã pick đủ.
   * 
   * API: POST /api/issues/{id}/confirm-pick
   * Body: { issueDetailId, pickedQuantity }
   * Requires Role: Staff | Admin
   */
  confirmPick: async (
    issueId: string,
    request: ConfirmPickRequest
  ): Promise<IssueDto> => {
    const response = await apiClient.post<ApiResponse<IssueDto>>(
      `/api/issues/${issueId}/confirm-pick`,
      request
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Không thể xác nhận nhặt hàng.');
    }
    return response.data.data;
  },
};

export default issueService;
