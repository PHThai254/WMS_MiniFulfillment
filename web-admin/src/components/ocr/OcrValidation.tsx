import React, { useState } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Table,
  Upload,
  message,
  Spin,
  Space,
  Divider,
  Alert,
  Typography,
} from 'antd';
import { InboxOutlined, PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import ocrService from '../../api/ocrService';
import productService from '../../api/productService';
import supplierService from '../../api/supplierService';
import zoneService from '../../api/zoneService';
import type { ReceiptOcrDto, OcrItemDto } from '../../types/api';
import type { SupplierDto } from '../../api/supplierService';
import type { ProductDto } from '../../api/productService';
import type { ZoneDto } from '../../api/zoneService';

const { TextArea } = Input;
const { Title } = Typography;

// ─── Kiểu local cho mỗi dòng item trong bảng ──────────────────────────────────
interface OcrItemRow extends OcrItemDto {
  key: string;
  // productId: string   ← kế thừa từ OcrItemDto (Guid)
  // zoneId: string      ← kế thừa từ OcrItemDto (Guid)
  // quantity: number    ← Số lượng AI đọc → ExpectedQuantity
  // actualQuantity: number ← Số lượng QA/QC chốt → ActualQuantity
}

/**
 * OcrValidation Component - Split View cho QA/QC duyệt hóa đơn OCR
 * Layout:
 * - Trái: Upload ảnh + Image Viewer có scroll (zoom)
 * - Phải: Form dữ liệu OCR với viền đỏ cho field nghi ngờ
 */
const OcrValidation: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<RcFile | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [ocrData, setOcrData] = useState<ReceiptOcrDto | null>(null);
  const [items, setItems] = useState<OcrItemRow[]>([]);

  // ─── Master Data State (kiểu id đều là string/Guid) ─────────────────────────
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [zones, setZones] = useState<ZoneDto[]>([]);

  // ─── Load danh sách Master Data khi mount ────────────────────────────────────
  React.useEffect(() => {
    const loadDataOptions = async () => {
      try {
        const [suppliersRes, productsRes, zonesRes] = await Promise.all([
          supplierService.getSuppliers(),
          productService.getProducts(),
          zoneService.getZones(),
        ]);
        setSuppliers(suppliersRes.data || []);
        setProducts(productsRes.data || []);
        setZones(zonesRes.data || []);
      } catch (error) {
        console.error('Failed to load master data options:', error);
        message.warning('Không thể tải danh mục. Vui lòng tải lại trang.');
      }
    };
    loadDataOptions();
  }, []);

  // ─── Upload ảnh ──────────────────────────────────────────────────────────────
  const handleBeforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Chỉ được upload file ảnh!');
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Ảnh phải nhỏ hơn 5MB!');
      return false;
    }
    return false; // Prevent auto upload
  };

  const handleUploadChange = (file: RcFile) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ─── Gửi ảnh lên Gemini API ──────────────────────────────────────────────────
  const handleExtractOcr = async () => {
    if (!imageFile) {
      message.error('Vui lòng chọn ảnh trước!');
      return;
    }
    setLoading(true);
    try {
      const result = await ocrService.extractInvoiceFromImage(imageFile);
      setOcrData(result);
      form.setFieldsValue({
        supplierName: result.supplierName,
        invoiceDate: result.invoiceDate ? dayjs(result.invoiceDate) : undefined,
      });

      // Khởi tạo items: actualQuantity mặc định = quantity AI đọc
      const itemsWithKey: OcrItemRow[] = result.items.map((item, idx) => ({
        ...item,
        key: `item_${idx}`,
        actualQuantity: item.quantity, // QA/QC có thể sửa lại
      }));
      setItems(itemsWithKey);
      message.success('Xử lý OCR thành công!');
    } catch (error: any) {
      message.error(error.message || 'Lỗi xử lý OCR');
    } finally {
      setLoading(false);
    }
  };

  // ─── Helper kiểm tra field nghi ngờ ─────────────────────────────────────────
  const isSuspiciousField = (fieldName: string): boolean => {
    if (!ocrData) return false;
    return ocrData.suspiciousFields.includes(fieldName);
  };

  const isItemFieldSuspicious = (itemIndex: number, fieldName: string): boolean => {
    if (!ocrData) return false;
    return ocrData.suspiciousFields.includes(`items[${itemIndex}].${fieldName}`);
  };

  // ─── Cập nhật 1 field trong item tại row index ───────────────────────────────
  const handleUpdateItemField = (
    index: number,
    field: keyof OcrItemRow,
    value: string | number | undefined,
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  // ─── Xóa item ────────────────────────────────────────────────────────────────
  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Thêm dòng item trống ─────────────────────────────────────────────────────
  const handleAddItem = () => {
    const newItem: OcrItemRow = {
      productName: '',
      productId: '',
      zoneId: '',
      quantity: 0,
      actualQuantity: 0,
      unitPrice: 0,
      key: `item_${Date.now()}`,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // ─── Định nghĩa cột Table ────────────────────────────────────────────────────
  const columns: ColumnsType<OcrItemRow> = [
    {
      title: 'Tên SP (AI đọc)',
      dataIndex: 'productName',
      key: 'productName',
      width: 130,
      render: (text, _, index) => (
        <span
          style={
            isItemFieldSuspicious(index, 'productName')
              ? { borderBottom: '2px solid red', display: 'block' }
              : {}
          }
        >
          {text || <em style={{ color: '#aaa' }}>Chưa có</em>}
        </span>
      ),
    },
    {
      title: (
        <span>
          Sản phẩm <span style={{ color: 'red' }}>*</span>
        </span>
      ),
      key: 'productId',
      width: 180,
      render: (_, record, index) => (
        <Select
          size="small"
          style={{ width: '100%' }}
          placeholder="Chọn sản phẩm"
          value={record.productId || undefined}
          showSearch
          optionFilterProp="label"
          options={products.map((p) => ({
            label: `${p.name} (${p.sku})`,
            value: p.id, // Guid string
          }))}
          onChange={(val: string) => handleUpdateItemField(index, 'productId', val)}
        />
      ),
    },
    {
      title: (
        <span>
          Zone <span style={{ color: 'red' }}>*</span>
        </span>
      ),
      key: 'zoneId',
      width: 150,
      render: (_, record, index) => (
        <Select
          size="small"
          style={{ width: '100%' }}
          placeholder="Chọn zone"
          value={record.zoneId || undefined}
          showSearch
          optionFilterProp="label"
          options={zones.map((z) => ({
            label: z.name,
            value: z.id, // Guid string
          }))}
          onChange={(val: string) => handleUpdateItemField(index, 'zoneId', val)}
        />
      ),
    },
    {
      title: 'SL AI đọc',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      render: (text, _, index) => (
        <span
          style={
            isItemFieldSuspicious(index, 'quantity')
              ? { borderBottom: '2px solid red', display: 'block', color: '#cf1322' }
              : { color: '#8c8c8c' }
          }
        >
          {text}
        </span>
      ),
    },
    {
      title: (
        <span>
          SL Thực tế <span style={{ color: 'red' }}>*</span>
        </span>
      ),
      key: 'actualQuantity',
      width: 110,
      render: (_, record, index) => (
        <InputNumber
          size="small"
          min={0}
          style={{ width: '100%' }}
          value={record.actualQuantity ?? record.quantity}
          onChange={(val) => handleUpdateItemField(index, 'actualQuantity', val ?? 0)}
        />
      ),
    },
    {
      title: 'Đơn giá',
      key: 'unitPrice',
      width: 110,
      render: (_, record, index) => (
        <InputNumber
          size="small"
          min={0}
          style={{ width: '100%' }}
          value={record.unitPrice}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          onChange={(val) => handleUpdateItemField(index, 'unitPrice', val ?? 0)}
        />
      ),
    },
    {
      title: 'Độ tin cậy',
      key: 'confidence',
      width: 80,
      render: (_, record) => {
        const avg =
          ((record.productNameConfidence || 0) +
            (record.quantityConfidence || 0) +
            (record.unitPriceConfidence || 0)) /
          3;
        return (
          <span style={{ color: avg < 0.7 ? 'red' : 'green', fontWeight: 600 }}>
            {(avg * 100).toFixed(0)}%
          </span>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 60,
      render: (_, __, index) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteItem(index)}
          size="small"
        />
      ),
    },
  ];

  // ─── Validate items trước khi submit ────────────────────────────────────────
  const validateItems = (): boolean => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId) {
        message.error(`Dòng ${i + 1}: Vui lòng chọn sản phẩm!`);
        return false;
      }
      if (!item.zoneId) {
        message.error(`Dòng ${i + 1}: Vui lòng chọn zone lưu trữ!`);
        return false;
      }
      const actual = item.actualQuantity ?? item.quantity;
      if (actual <= 0) {
        message.error(`Dòng ${i + 1}: Số lượng thực tế phải > 0!`);
        return false;
      }
    }
    return true;
  };

  // ─── Lưu phiếu nhập ──────────────────────────────────────────────────────────
  const handleSaveReceipt = async () => {
    try {
      const values = await form.validateFields();

      if (items.length === 0) {
        message.error('Phải có ít nhất 1 sản phẩm!');
        return;
      }

      if (!validateItems()) return;

      setLoading(true);

      // Mapping chuẩn sang DTO gửi Backend
      // supplierId: string (Guid), productId: string (Guid), zoneId: string (Guid)
      const request = {
        supplierId: values.supplierId as string,         // Guid từ Select
        invoiceDate: (values.invoiceDate as dayjs.Dayjs).format('YYYY-MM-DD'),
        items: items.map((item) => ({
          productId: item.productId!,                    // Guid string
          zoneId: item.zoneId!,                          // Guid string
          expectedQuantity: item.quantity,               // Số AI đọc
          actualQuantity: item.actualQuantity ?? item.quantity, // Số QA/QC chốt
          unitPrice: item.unitPrice,
        })),
        notes: values.notes as string | undefined,
      };

      await ocrService.saveReceiptFromOcr(request);
      message.success('Lưu phiếu nhập thành công!');

      // Reset toàn bộ form
      form.resetFields();
      setImageFile(null);
      setImagePreview('');
      setOcrData(null);
      setItems([]);
    } catch (error: any) {
      message.error(error.message || 'Lỗi lưu phiếu nhập');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Duyệt Hóa Đơn OCR</Title>

      <Spin spinning={loading}>
        <Row gutter={24}>
          {/* ── Left Panel: Upload & Image Viewer ───────────────────────────── */}
          <Col xs={24} lg={12}>
            <Card title="Upload Hóa Đơn" style={{ marginBottom: '24px' }}>
              <Upload.Dragger
                beforeUpload={handleBeforeUpload}
                customRequest={() => {}}
                onChange={(info) => {
                  if (info.file instanceof File || 'originFileObj' in info.file) {
                    const file = (info.file as any).originFileObj || info.file;
                    handleUploadChange(file as RcFile);
                  }
                }}
                maxCount={1}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Kéo thả ảnh hóa đơn vào đây</p>
                <p className="ant-upload-hint">hoặc click để chọn (JPEG, PNG, GIF, WebP, max 5MB)</p>
              </Upload.Dragger>

              <Button
                type="primary"
                style={{ marginTop: '16px', width: '100%' }}
                onClick={handleExtractOcr}
                loading={loading}
                disabled={!imageFile}
              >
                Xử lý OCR
              </Button>
            </Card>

            {imagePreview && (
              <Card title="Xem ảnh hóa đơn">
                <div
                  style={{
                    maxHeight: '600px',
                    overflow: 'auto',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Invoice"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '600px',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              </Card>
            )}
          </Col>

          {/* ── Right Panel: Form & Data ─────────────────────────────────────── */}
          <Col xs={24} lg={12}>
            {ocrData && (
              <>
                {ocrData.suspiciousFields.length > 0 && (
                  <Alert
                    message="⚠️ Các field nghi ngờ"
                    description={`Các trường sau có độ tin cậy thấp (<70%), vui lòng kiểm tra kỹ: ${ocrData.suspiciousFields.join(', ')}`}
                    type="warning"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />
                )}

                <Card title="Dữ liệu Hóa Đơn (Chờ Duyệt)">
                  <Form form={form} layout="vertical">

                    {/* ── Nhà Cung Cấp (Guid Dropdown) ──────────────────────── */}
                    <Form.Item
                      name="supplierId"
                      label="Nhà Cung Cấp"
                      rules={[{ required: true, message: 'Vui lòng chọn nhà cung cấp' }]}
                      style={
                        isSuspiciousField('supplierName')
                          ? { border: '1px solid red', borderRadius: '4px', padding: '8px' }
                          : {}
                      }
                    >
                      <Select
                        placeholder="Chọn nhà cung cấp"
                        showSearch
                        optionFilterProp="label"
                        options={suppliers.map((s) => ({
                          label: s.name,
                          value: s.id, // Guid string
                        }))}
                      />
                    </Form.Item>

                    {/* ── Ngày Hóa Đơn ───────────────────────────────────────── */}
                    <Form.Item
                      name="invoiceDate"
                      label="Ngày Hóa Đơn"
                      rules={[{ required: true, message: 'Vui lòng chọn ngày hóa đơn' }]}
                      style={
                        isSuspiciousField('invoiceDate')
                          ? { border: '1px solid red', borderRadius: '4px', padding: '8px' }
                          : {}
                      }
                    >
                      <DatePicker />
                    </Form.Item>

                    <Divider>Danh Sách Sản Phẩm</Divider>

                    {/* ── Bảng Items: Product + Zone + ActualQty ─────────────── */}
                    <Table
                      columns={columns}
                      dataSource={items}
                      pagination={false}
                      size="small"
                      scroll={{ x: 900 }}
                      style={{ marginBottom: '16px' }}
                    />

                    <Button
                      icon={<PlusOutlined />}
                      onClick={handleAddItem}
                      style={{ marginBottom: '16px' }}
                    >
                      Thêm Sản Phẩm
                    </Button>

                    {/* ── Ghi Chú ────────────────────────────────────────────── */}
                    <Form.Item name="notes" label="Ghi Chú">
                      <TextArea rows={3} placeholder="Ghi chú từ QA/QC (nếu có)" />
                    </Form.Item>

                    {/* ── Action Buttons ─────────────────────────────────────── */}
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button
                          onClick={() => {
                            form.resetFields();
                            setOcrData(null);
                            setItems([]);
                            setImageFile(null);
                            setImagePreview('');
                          }}
                        >
                          Hủy
                        </Button>
                        <Button
                          type="primary"
                          size="large"
                          icon={<SaveOutlined />}
                          onClick={handleSaveReceipt}
                          loading={loading}
                        >
                          ✓ Duyệt & Lưu
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </Card>
              </>
            )}
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default OcrValidation;
