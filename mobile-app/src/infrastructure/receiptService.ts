// mobile-app/src/infrastructure/receiptService.ts
// Service layer gọi API phiếu nhập kho (Receipts)
// Tuần 6 - Đức Anh: Tích hợp API cho luồng Put-away

import apiClient from '../di/apiClient';
import type { ApiResponse, ReceiptDto } from './wmsTypes';

const receiptService = {
  /**
   * Lấy toàn bộ danh sách phiếu nhập kho.
   * Mobile App sẽ tự lọc phía Client theo status = 'QC_Checked' để hiển thị Task List.
   */
  getAll: async (): Promise<ReceiptDto[]> => {
    const response = await apiClient.get<ApiResponse<ReceiptDto[]>>('/api/receipts');
    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Không thể tải danh sách phiếu nhập.');
    }
    return response.data.data ?? [];
  },

  /**
   * Lấy chi tiết 1 phiếu nhập kho theo ID.
   */
  getById: async (id: string): Promise<ReceiptDto> => {
    const response = await apiClient.get<ApiResponse<ReceiptDto>>(`/api/receipts/${id}`);
    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Không tìm thấy phiếu nhập.');
    }
    return response.data.data;
  },

  /**
   * Hoàn thành cất hàng (Put-away): cộng tồn kho và chuyển phiếu sang Completed.
   * Gọi sau khi thủ kho quét xong sản phẩm + zone + số lượng trên Mobile.
   * 
   * API: POST /api/receipts/{id}/complete-putaway
   * Requires Role: Staff | Admin
   */
  completePutAway: async (receiptId: string): Promise<ReceiptDto> => {
    const response = await apiClient.post<ApiResponse<ReceiptDto>>(
      `/api/receipts/${receiptId}/complete-putaway`
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Không thể hoàn thành cất hàng.');
    }
    return response.data.data;
  },
};

export default receiptService;
