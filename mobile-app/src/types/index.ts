/**
 * Mobile App Types & Models
 * Đồng bộ với Backend DTOs từ WMS.Application
 */

// ──────────────────────────────────────────────────────────────────────────
// 🔐 AUTH & USER
// ──────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'Admin' | 'QA_QC' | 'Staff';
  warehouseId?: string;
  warehouseName?: string;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ──────────────────────────────────────────────────────────────────────────
// 🏭 MASTER DATA
// ──────────────────────────────────────────────────────────────────────────

export interface Warehouse {
  id: string;
  name: string;
  address: string;
}

export interface Zone {
  id: string;
  warehouseId: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  price: number;
  categoryId: string;
  categoryName: string;
  imagePath?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  deliveryAddress?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 📦 INVENTORY & STOCK
// ──────────────────────────────────────────────────────────────────────────

export interface Inventory {
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

export interface InventoryTransaction {
  id: string;
  productId: string;
  zoneId: string;
  quantityChange: number;
  transactionType: 'INBOUND' | 'OUTBOUND' | 'ADJUST';
  referenceId: string;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 📥 RECEIPT (PHIẾU NHẬP KHO) - PUT-AWAY
// ──────────────────────────────────────────────────────────────────────────

export type ReceiptStatus = 'Draft' | 'QC_Checked' | 'Completed';

export interface ReceiptDetail {
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

export interface Receipt {
  id: string;
  warehouseId: string;
  supplierId?: string;
  supplierName?: string;
  createdBy: string;
  status: ReceiptStatus;
  details: ReceiptDetail[];
  createdAt: string;
  updatedAt?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 📤 ISSUE (PHIẾU XUẤT KHO) - PICKING
// ──────────────────────────────────────────────────────────────────────────

export type IssueStatus = 'Pending' | 'Picking' | 'Handover' | 'Completed';

export interface IssueDetail {
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

export interface Issue {
  id: string;
  warehouseId: string;
  customerId?: string;
  customerName?: string;
  createdBy: string;
  status: IssueStatus;
  details: IssueDetail[];
  createdAt: string;
  updatedAt?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 🎯 PICKING PLAN (FIFO)
// ──────────────────────────────────────────────────────────────────────────

export interface PickingPlanItem {
  issueDetailId: string;
  productId: string;
  productName: string;
  productBarcode: string;
  zoneId: string;
  zoneName: string;
  quantityToPick: number;
  restockedDate: string; // Ngày nhập (cũ nhất lên đầu)
}

export interface PickingPlan {
  issueId: string;
  items: PickingPlanItem[];
}

// ──────────────────────────────────────────────────────────────────────────
// 🔄 TASK TYPES (Dùng trong Mobile App)
// ──────────────────────────────────────────────────────────────────────────

export type TaskType = 'putaway' | 'picking';

export interface PutAwayTask {
  taskId: string;
  taskType: 'putaway';
  receiptId: string;
  details: ReceiptDetail[];
  totalItems: number;
  status: ReceiptStatus;
}

export interface PickingTask {
  taskId: string;
  taskType: 'picking';
  issueId: string;
  details: IssueDetail[];
  pickingPlan?: PickingPlan;
  totalItems: number;
  status: IssueStatus;
}

export type Task = PutAwayTask | PickingTask;

// ──────────────────────────────────────────────────────────────────────────
// 📝 SCANNING & MOBILE STATE
// ──────────────────────────────────────────────────────────────────────────

export interface BarcodeData {
  barcode: string;
  timestamp: number;
}

export interface ScanResult {
  barcode: string;
  isValid: boolean;
  product?: Product;
  zone?: Zone;
}

export interface OfflineAction {
  id: string;
  action: 'confirm_pick' | 'complete_putaway' | 'handover';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

// ──────────────────────────────────────────────────────────────────────────
// 📊 API RESPONSE WRAPPER
// ──────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}
