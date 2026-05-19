import type { AxiosInstance } from 'axios';
import apiClient from './client';
import API_ENDPOINTS from './endpoints';
import type { ApiResponse } from '../types/api';

export interface ReceiptOcrDto {
  supplierName?: string;
  supplierNameConfidence?: number;
  invoiceDate?: string;
  invoiceDateConfidence?: number;
  items: OcrItemDto[];
  suspiciousFields: string[];
}

export interface OcrItemDto {
  productName?: string;
  productNameConfidence?: number;
  quantity: number;
  quantityConfidence?: number;
  unitPrice: number;
  unitPriceConfidence?: number;
}

export interface SaveOcrReceiptRequest {
  supplierId: number;
  invoiceDate: string;
  items: SaveOcrReceiptItemRequest[];
  notes?: string;
}

export interface SaveOcrReceiptItemRequest {
  productId: number;
  zoneId: number;
  quantity: number;
  unitPrice: number;
}

/**
 * OCR Service - Xử lý Upload ảnh hóa đơn lên Gemini API
 */
class OcrService {
  private client: AxiosInstance = apiClient;

  /**
   * Upload ảnh hóa đơn và gửi lên Gemini API để trích xuất dữ liệu
   * @param imageFile File ảnh hóa đơn (JPEG, PNG, GIF, WebP)
   * @returns Promise với dữ liệu OCR (chứa danh sách field nghi ngờ)
   */
  async extractInvoiceFromImage(imageFile: File): Promise<ReceiptOcrDto> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await this.client.post<ApiResponse<ReceiptOcrDto>>(
      API_ENDPOINTS.ocr.extractInvoice,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Không thể xử lý OCR');
    }

    return response.data.data as ReceiptOcrDto;
  }

  /**
   * Lưu Receipt sau khi QA/QC duyệt/sửa dữ liệu OCR
   * @param request Dữ liệu phiếu nhập đã được duyệt
   * @returns Promise với ID phiếu nhập mới được tạo
   */
  async saveReceiptFromOcr(request: SaveOcrReceiptRequest): Promise<number> {
    const response = await this.client.post<ApiResponse<{ id: number }>>(
      API_ENDPOINTS.ocr.saveReceipt,
      request
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Không thể lưu phiếu nhập');
    }

    return response.data.data?.id || 0;
  }
}

export default new OcrService();
