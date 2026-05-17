# Skill: Gemini AI OCR Integration
- Khi gọi Google Gemini API để bóc tách hóa đơn, luôn ép cấu hình `responseMimeType: "application/json"`.
- Dữ liệu trả về phải được xử lý cẩn thận tại tầng C#. Luôn bọc logic parse JSON bằng `try-catch`.
- Chuẩn JSON kỳ vọng:
{
  "supplierName": "string",
  "invoiceDate": "YYYY-MM-DD",
  "items": [ { "productName": "string", "quantity": number } ]
}