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
  supplierId: string; 
  invoiceDate: string;
  items: SaveOcrReceiptItemRequest[];
  notes?: string;
}

export interface SaveOcrReceiptItemRequest {
  productId: string;        // Guid
  zoneId: string;           // Guid
  expectedQuantity: number; // Số lượng AI đọc được (ExpectedQuantity)
  actualQuantity: number;   // Số lượng QA/QC chốt thực tế (ActualQuantity)
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
  // Trả về Promise<string> vì ID phiếu nhập dưới Backend cũng là Guid
  async saveReceiptFromOcr(request: SaveOcrReceiptRequest): Promise<string> { 
    // Ép kiểu dữ liệu trả về { id: string }
    const response = await this.client.post<ApiResponse<{ id: string }>>( 
      API_ENDPOINTS.ocr.saveReceipt,
      request
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Không thể lưu phiếu nhập');
    }

    // Trả về chuỗi rỗng '' thay vì số 0 nếu không có ID
    return response.data.data?.id || ''; 
  }
}

export default new OcrService();