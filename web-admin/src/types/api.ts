// API Response Wrapper Type
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    errors?: string[];
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    skip: number;
    take: number;
}

export interface PaginatedApiResponse<T> extends ApiResponse<PaginatedResponse<T>> { }

// OCR Related Types
export interface OcrItemDto {
  productId?: string;  // Guid - QA/QC mapping từ dropdown
  zoneId?: string;     // Guid - QA/QC mapping từ dropdown
  productName?: string;
  productNameConfidence?: number;
  quantity: number;              // Số lượng AI đọc (ExpectedQuantity)
  actualQuantity?: number;       // Số lượng QA/QC chốt thực tế (ActualQuantity)
  quantityConfidence?: number;
  unitPrice: number;
  unitPriceConfidence?: number;
}

export interface ReceiptOcrDto {
    supplierName?: string;
    supplierNameConfidence?: number;
    invoiceDate?: string;
    invoiceDateConfidence?: number;
    items: OcrItemDto[];
    suspiciousFields: string[];
}
