// mobile-app/src/infrastructure/inventoryService.ts
// Service gọi API cho Staff: Put-away & Picking theo đúng flow backend
import apiClient from '../di/apiClient';
import type { ApiResponse } from '../di/apiClient';

// ── Picking DTOs (khớp với backend ConfirmPickRequest) ──────────────────────

/** Item trong lộ trình nhặt hàng FIFO do backend tạo ra */
export interface PickingPlanItem {
    issueDetailId: string;
    productId: string;
    productName: string;
    productBarcode: string;
    zoneId: string;
    zoneName: string;
    quantityToPick: number;
    restockedDate: string;
}

export interface PickingPlan {
    issueId: string;
    items: PickingPlanItem[];
}

/** Request xác nhận nhặt 1 IssueDetail (khớp backend ConfirmPickRequest) */
export interface ConfirmPickRequest {
    issueDetailId: string;  // ID của IssueDetail vừa nhặt
    pickedQuantity: number; // Số lượng thực tế đã nhặt
}

// ── PutAway DTOs ─────────────────────────────────────────────────────────────

export interface PutAwayResult {
    receiptId: string;
    status: string;
    message?: string;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const inventoryService = {
    /**
     * PICKING STEP 1: Lấy lộ trình nhặt hàng FIFO cho một Issue.
     * Staff dùng kết quả này để biết cần đến Zone nào, nhặt sản phẩm nào.
     * Backend sắp xếp theo LastRestockedDate ASC (FIFO).
     *
     * Route: GET /api/Issues/{issueId}/picking-plan
     */
    getPickingPlan: async (issueId: string): Promise<ApiResponse<PickingPlan>> => {
        const response = await apiClient.get<ApiResponse<PickingPlan>>(
            `/api/Issues/${issueId}/picking-plan`
        );
        return response.data;
    },

    /**
     * PICKING STEP 2: Xác nhận Staff đã nhặt xong 1 item trong Issue.
     * Gọi lần lượt cho từng PickingPlanItem khi Staff quét barcode.
     * Backend trừ Inventory, ghi InventoryTransaction OUTBOUND.
     *
     * Route: POST /api/Issues/{issueId}/confirm-pick
     * Body: { issueDetailId, pickedQuantity }
     */
    confirmPicking: async (
        issueId: string,
        data: ConfirmPickRequest
    ): Promise<ApiResponse<object>> => {
        const response = await apiClient.post<ApiResponse<object>>(
            `/api/Issues/${issueId}/confirm-pick`,
            data
        );
        return response.data;
    },

    /**
     * PUT-AWAY: Staff xác nhận đã cất xong toàn bộ hàng của một Receipt.
     * Backend cộng Inventory cho từng ReceiptDetail đã được QA_QC duyệt,
     * ghi InventoryTransaction INBOUND, chuyển Receipt sang Completed.
     *
     * Route: POST /api/Receipts/{receiptId}/complete-putaway
     */
    completePutAway: async (receiptId: string): Promise<ApiResponse<object>> => {
        const response = await apiClient.post<ApiResponse<object>>(
            `/api/Receipts/${receiptId}/complete-putaway`
        );
        return response.data;
    },
};
