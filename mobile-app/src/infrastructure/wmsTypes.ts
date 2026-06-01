// mobile-app/src/infrastructure/wmsTypes.ts
// Định nghĩa kiểu dữ liệu dùng chung cho toàn bộ tầng Infrastructure

/** Wrapper chuẩn của mọi API response từ WMS Backend */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── RECEIPT (PHIẾU NHẬP KHO) ───────────────────────────────────────────────

export type ReceiptStatus = 'Draft' | 'QC_Checked' | 'Completed';

export interface ReceiptDetailDto {
  id: string;
  receiptId: string;
  productId: string;
  productName: string;
  productBarcode: string;
  zoneId?: string;
  zoneName?: string;
  expectedQuantity: number;
  actualQuantity: number;
  unitPrice?: number;
}

export interface ReceiptDto {
  id: string;
  warehouseId: string;
  warehouseName: string;
  supplierId?: string;
  supplierName?: string;
  createdBy: string;
  status: ReceiptStatus;
  createdAt: string;
  receiptDetails: ReceiptDetailDto[];
}

// ─── ISSUE (PHIẾU XUẤT KHO) ─────────────────────────────────────────────────

export type IssueStatus = 'Pending' | 'Picking' | 'Handover';

export interface IssueDetailDto {
  id: string;
  issueId: string;
  productId: string;
  productName: string;
  productBarcode: string;
  zoneId?: string;
  zoneName?: string;
  quantityToPick: number;
  pickedQuantity: number;
}

export interface IssueDto {
  id: string;
  warehouseId: string;
  warehouseName: string;
  customerId?: string;
  customerName?: string;
  createdBy: string;
  status: IssueStatus;
  createdAt: string;
  issueDetails: IssueDetailDto[];
}

// ─── PICKING PLAN (LỘ TRÌNH FIFO) ───────────────────────────────────────────

export interface PickingPlanItemDto {
  issueDetailId: string;
  productId: string;
  productName: string;
  productBarcode: string;
  zoneId: string;
  zoneName: string;
  quantityToPick: number;
  restockedDate: string;
}

export interface PickingPlanDto {
  issueId: string;
  items: PickingPlanItemDto[];
}

// ─── CONFIRM PICK REQUEST ────────────────────────────────────────────────────

export interface ConfirmPickRequest {
  issueDetailId: string;
  pickedQuantity: number;
}
