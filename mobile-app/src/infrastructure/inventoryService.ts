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

export interface ReceiptDetailDto {
    id: string;
    receiptId: string;
    productId: string;
    productName: string;
    productBarcode: string;
    zoneId: string;
    zoneName: string;
    expectedQuantity: number;
    actualQuantity: number;
    unitPrice: number;
}

export interface ReceiptDto {
    id: string;
    warehouseId: string;
    supplierId?: string;
    createdBy: string;
    status: 'Draft' | 'QC_Checked' | 'Completed';
    details: ReceiptDetailDto[];
    createdAt: string;
}

export interface PutAwayResult {
    receiptId: string;
    status: string;
    message?: string;
}

// ── Issue/Picking DTOs ───────────────────────────────────────────────────────

export interface IssueDetailDto {
    id: string;
    issueId: string;
    productId: string;
    productName: string;
    productBarcode: string;
    zoneId: string;
    zoneName: string;
    quantityToPick: number;
    pickedQuantity: number;
}

export interface IssueDto {
    id: string;
    warehouseId: string;
    customerId?: string;
    createdBy: string;
    status: 'Pending' | 'Picking' | 'Handover' | 'Completed';
    details: IssueDetailDto[];
    createdAt: string;
}

// ── Product & Inventory DTOs ─────────────────────────────────────────────────

export interface ProductDto {
    id: string;
    sku: string;
    barcode: string;
    name: string;
    price: number;
    categoryId: string;
    categoryName: string;
    imagePath?: string;
}

export interface InventoryDto {
    id: string;
    warehouseId: string;
    warehouseName: string;
    zoneId: string;
    zoneName: string;
    productId: string;
    productName: string;
    productBarcode: string;
    productSKU: string;
    productPrice: number;
    quantity: number;
    lastRestockedDate: string;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const inventoryService = {
    // ──────────────────────────────────────────────────────────────────────
    // ✅ DANH SÁCH PHIẾU NHẬP (PUT-AWAY TASK LIST)
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Lấy danh sách phiếu nhập chờ cất hàng (status = QC_Checked)
     * Route: GET /api/Receipts
     */
    getReceiptList: async (): Promise<ApiResponse<ReceiptDto[]>> => {
        const response = await apiClient.get<ApiResponse<ReceiptDto[]>>(
            '/api/Receipts'
        );
        return response.data;
    },

    /**
     * Lấy chi tiết 1 phiếu nhập
     * Route: GET /api/Receipts/{receiptId}
     */
    getReceiptById: async (receiptId: string): Promise<ApiResponse<ReceiptDto>> => {
        const response = await apiClient.get<ApiResponse<ReceiptDto>>(
            `/api/Receipts/${receiptId}`
        );
        return response.data;
    },

    // ──────────────────────────────────────────────────────────────────────
    // ✅ DANH SÁCH PHIẾU XUẤT (PICKING TASK LIST)
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Lấy danh sách phiếu xuất chờ nhặt hàng (status = Pending)
     * Route: GET /api/Issues
     */
    getIssueList: async (): Promise<ApiResponse<IssueDto[]>> => {
        const response = await apiClient.get<ApiResponse<IssueDto[]>>(
            '/api/Issues'
        );
        return response.data;
    },

    /**
     * Lấy chi tiết 1 phiếu xuất
     * Route: GET /api/Issues/{issueId}
     */
    getIssueById: async (issueId: string): Promise<ApiResponse<IssueDto>> => {
        const response = await apiClient.get<ApiResponse<IssueDto>>(
            `/api/Issues/${issueId}`
        );
        return response.data;
    },

    // ──────────────────────────────────────────────────────────────────────
    // ✅ PICKING WORKFLOW (FIFO-based)
    // ──────────────────────────────────────────────────────────────────────
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

    // ──────────────────────────────────────────────────────────────────────
    // ✅ HANDOVER WORKFLOW
    // ──────────────────────────────────────────────────────────────────────

    /**
     * HANDOVER: Staff xác nhận đã chuẩn bị xong hàng cho vận chuyển
     * Backend chuyển Issue sang Handover status
     *
     * Route: POST /api/Issues/{issueId}/handover
     */
    handoverIssue: async (issueId: string): Promise<ApiResponse<object>> => {
        const response = await apiClient.post<ApiResponse<object>>(
            `/api/Issues/${issueId}/handover`
        );
        return response.data;
    },

    // ──────────────────────────────────────────────────────────────────────
    // ✅ PRODUCT & INVENTORY LOOKUP
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Tìm sản phẩm theo barcode
     * Route: GET /api/Products/barcode/{barcode}
     */
    getProductByBarcode: async (barcode: string): Promise<ApiResponse<ProductDto>> => {
        const response = await apiClient.get<ApiResponse<ProductDto>>(
            `/api/Products/barcode/${barcode}`
        );
        return response.data;
    },

    /**
     * Lấy danh sách sản phẩm (phân trang)
     * Route: GET /api/Products
     */
    getProductList: async (pageNumber = 1, pageSize = 100): Promise<ApiResponse<ProductDto[]>> => {
        const response = await apiClient.get<ApiResponse<ProductDto[]>>(
            `/api/Products?pageNumber=${pageNumber}&pageSize=${pageSize}`
        );
        return response.data;
    },

    /**
     * Lấy tồn kho (phân trang)
     * Route: GET /api/Inventory
     */
    getInventory: async (pageNumber = 1, pageSize = 50): Promise<ApiResponse<InventoryDto[]>> => {
        const response = await apiClient.get<ApiResponse<InventoryDto[]>>(
            `/api/Inventory?pageNumber=${pageNumber}&pageSize=${pageSize}`
        );
        return response.data;
    },

    /**
     * Lấy tổng hợp tồn kho theo kho
     * Route: GET /api/Inventory/stock-summary
     */
    getStockSummary: async (): Promise<ApiResponse<InventoryDto[]>> => {
        const response = await apiClient.get<ApiResponse<InventoryDto[]>>(
            '/api/Inventory/stock-summary'
        );
        return response.data;
    },

