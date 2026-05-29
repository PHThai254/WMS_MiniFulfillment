import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ApiResponse } from '../types/api';
import type {
    IReceipt, IReceiptDetail, IOcrResult,
    IIssue, IPickingPlan,
    IInventory, IStockSummary, IInventoryTransaction,
    IDashboardKpi, ILowStockProduct, IStockMovement,
    IUser, IRole
} from '../types/domain';

// ====== RECEIPT SERVICE ======
export const receiptService = {
    list: async () => apiClient.get(API_ENDPOINTS.receipts.list) as Promise<ApiResponse<IReceipt[]>>,
    get: async (id: string) => apiClient.get(API_ENDPOINTS.receipts.get(id)) as Promise<ApiResponse<IReceipt>>,
    create: async (data: {
        warehouseId: string;
        supplierId?: string;
        details: { productId: string; expectedQuantity: number }[];
    }) => apiClient.post(API_ENDPOINTS.receipts.create, data) as Promise<ApiResponse<IReceipt>>,
    approveQc: async (id: string, data: {
        details: { detailId: string; actualQuantity: number; zoneId?: string }[];
    }) => apiClient.post(API_ENDPOINTS.receipts.approveQc(id), data) as Promise<ApiResponse<IReceipt>>,
    completePutaway: async (id: string) =>
        apiClient.post(API_ENDPOINTS.receipts.completePutaway(id), {}) as Promise<ApiResponse<IReceipt>>,
    runOcr: async (formData: FormData) => {
        const resp = await apiClient.post(API_ENDPOINTS.ocr.extractInvoice, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return resp as unknown as ApiResponse<IOcrResult>;
    },
};

// ====== ISSUE SERVICE ======
export const issueService = {
    list: async () => apiClient.get(API_ENDPOINTS.issues.list) as Promise<ApiResponse<IIssue[]>>,
    get: async (id: string) => apiClient.get(API_ENDPOINTS.issues.get(id)) as Promise<ApiResponse<IIssue>>,
    create: async (data: {
        warehouseId: string;
        customerId?: string;
        details: { productId: string; quantityToPick: number }[];
    }) => apiClient.post(API_ENDPOINTS.issues.create, data) as Promise<ApiResponse<IIssue>>,
    getPickingPlan: async (id: string) =>
        apiClient.get(API_ENDPOINTS.issues.pickingPlan(id)) as Promise<ApiResponse<IPickingPlan>>,
    confirmPick: async (id: string, data: { issueDetailId: string; pickedQuantity: number }) =>
        apiClient.post(API_ENDPOINTS.issues.confirmPick(id), data) as Promise<ApiResponse<IIssue>>,
    handover: async (id: string) =>
        apiClient.post(API_ENDPOINTS.issues.handover(id), {}) as Promise<ApiResponse<IIssue>>,
};

// ====== INVENTORY SERVICE ======
export const inventoryService = {
    list: async (params?: { pageIndex?: number; pageSize?: number; warehouseId?: string; zoneId?: string }) => {
        const query = new URLSearchParams();
        if (params?.pageIndex) query.append('pageIndex', params.pageIndex.toString());
        if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
        if (params?.warehouseId) query.append('warehouseId', params.warehouseId);
        if (params?.zoneId) query.append('zoneId', params.zoneId);
        return apiClient.get(`${API_ENDPOINTS.inventory.list}?${query}`) as Promise<ApiResponse<import('../types/domain').IPagedResult<IInventory>>>;
    },
    stockSummary: async () => apiClient.get(API_ENDPOINTS.inventory.stockSummary) as Promise<ApiResponse<IStockSummary[]>>,
    transactions: async (pageIndex = 1, pageSize = 50) =>
        apiClient.get(`${API_ENDPOINTS.inventory.transactions}?pageIndex=${pageIndex}&pageSize=${pageSize}`) as Promise<ApiResponse<import('../types/domain').IPagedResult<IInventoryTransaction>>>,
    adjust: async (data: { productId: string; zoneId: string; newQuantity: number; reason: string }) =>
        apiClient.post(API_ENDPOINTS.inventory.adjust, data) as Promise<ApiResponse<null>>,
};

// ====== ANALYTICS SERVICE ======
export const analyticsService = {
    kpis: async () => apiClient.get(API_ENDPOINTS.analytics.kpis) as Promise<ApiResponse<IDashboardKpi>>,
    lowStock: async (top = 5) =>
        apiClient.get(`${API_ENDPOINTS.analytics.lowStock}?top=${top}`) as Promise<ApiResponse<ILowStockProduct[]>>,
    stockMovements: async (days = 7) =>
        apiClient.get(`${API_ENDPOINTS.analytics.stockMovements}?days=${days}`) as Promise<ApiResponse<IStockMovement[]>>,
};

// ====== USER MANAGEMENT SERVICE ======
export const userService = {
    list: async () => apiClient.get(API_ENDPOINTS.users.list) as Promise<ApiResponse<IUser[]>>,
    get: async (id: string) => apiClient.get(API_ENDPOINTS.users.get(id)) as Promise<ApiResponse<IUser>>,
    create: async (data: { username: string; password: string; roleId: string; warehouseId?: string }) =>
        apiClient.post(API_ENDPOINTS.users.create, data) as Promise<ApiResponse<IUser>>,
    update: async (id: string, data: { username: string; roleId: string; warehouseId?: string }) =>
        apiClient.put(API_ENDPOINTS.users.update(id), data) as Promise<ApiResponse<IUser>>,
    delete: async (id: string) => apiClient.delete(API_ENDPOINTS.users.delete(id)) as Promise<ApiResponse<null>>,
    changePassword: async (id: string, newPassword: string) =>
        apiClient.post(API_ENDPOINTS.users.changePassword(id), { newPassword }) as Promise<ApiResponse<null>>,
    getRoles: async () => apiClient.get(API_ENDPOINTS.users.roles) as Promise<ApiResponse<IRole[]>>,
};
