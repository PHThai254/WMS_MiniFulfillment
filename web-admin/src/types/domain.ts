// Domain Types - Synchronized with Backend DTOs (Guid string IDs)

export interface IPagedResult<T> {
    items: T[];
    totalCount: number;
    pageIndex: number;
    pageSize: number;
    totalPages: number;
}
export interface IWarehouse {
    id: string;
    name: string;
    location: string;
    zoneCount?: number;
}

export interface IZone {
    id: string;
    warehouseId: string;
    warehouseName: string;
    name: string;
}

export interface ICategory {
    id: string;
    name: string;
    productCount?: number;
}

export interface IProduct {
    price: number;
    id: string;
    sku: string;
    barcode: string;
    name: string;
    categoryId: string;
    categoryName: string;
}

export interface ISupplier {
    id: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    address?: string;
}

export interface ICustomer {
    id: string;
    name: string;
    phone?: string;
    deliveryAddress?: string;
}

export interface IInventory {
    id: string;
    warehouseId: string;
    warehouseName: string;
    zoneId: string;
    zoneName: string;
    productId: string;
    productName: string;
    productBarcode: string;
    productSKU: string;
    quantity: number;
    lastRestockedDate: string;
    productPrice?: number;
}

export interface IStockSummary {
    productId: string;
    productName: string;
    productBarcode: string;
    productSKU: string;
    totalQuantity: number;
    stockByZone: IStockByZone[];
    productPrice?: number;
}

export interface IStockByZone {
    zoneId: string;
    zoneName: string;
    quantity: number;
    lastRestockedDate: string;
}

export interface IInventoryTransaction {
    id: string;
    productId: string;
    productName: string;
    zoneId: string;
    zoneName: string;
    quantityChange: number;
    transactionType: 'INBOUND' | 'OUTBOUND' | 'ADJUST';
    referenceId?: string;
    createdAt: string;
}

// Receipt (Phiếu Nhập)
export type ReceiptStatus = 'Draft' | 'QC_Checked' | 'Completed';

export interface IReceipt {
    id: string;
    warehouseId: string;
    warehouseName: string;
    supplierId?: string;
    supplierName?: string;
    createdBy: string;
    status: ReceiptStatus;
    createdAt: string;
    receiptDetails: IReceiptDetail[];
}

export interface IReceiptDetail {
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

// Issue (Phiếu Xuất)
export type IssueStatus = 'Pending' | 'Picking' | 'Handover';

export interface IIssue {
    id: string;
    warehouseId: string;
    warehouseName: string;
    customerId?: string;
    customerName?: string;
    createdBy: string;
    status: IssueStatus;
    createdAt: string;
    issueDetails: IIssueDetail[];
}

export interface IIssueDetail {
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

export interface IPickingPlan {
    issueId: string;
    items: IPickingPlanItem[];
}

export interface IPickingPlanItem {
    issueDetailId: string;
    productId: string;
    productName: string;
    productBarcode: string;
    zoneId: string;
    zoneName: string;
    quantityToPick: number;
    restockedDate: string;
}

// Analytics
export interface IDashboardKpi {
    pendingReceipts: number;
    activeIssues: number;
    totalProducts: number;
    totalWarehouses: number;
    lowStockAlerts: number;
    completedReceiptsToday: number;
}

export interface ILowStockProduct {
    productId: string;
    productName: string;
    productBarcode: string;
    totalQuantity: number;
}

export interface IStockMovement {
    date: string;
    inbound: number;
    outbound: number;
}

// User Management
export interface IUser {
    id: string;
    username: string;
    roleName: string;
    roleId: string;
    warehouseId?: string;
    warehouseName?: string;
}

export interface IRole {
    id: string;
    name: string;
    description: string;
}

// OCR
export interface IOcrResult {
    rawJson: string;
    items: IOcrLineItem[];
    hasLowConfidence: boolean;
}

export interface IOcrLineItem {
    productName: string;
    quantity: number;
    isLowConfidence: boolean;
}
