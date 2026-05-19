import React, { useState, useRef } from 'react';
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
  Tabs,
} from 'antd';
import { InboxOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import ocrService from '../../api/ocrService';
import productService from '../../api/productService';
import supplierService from '../../api/supplierService';
import zoneService from '../../api/zoneService';
import type { ReceiptOcrDto, OcrItemDto } from '../../types/api';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface SupplierOption {
  id: number;
  name: string;
}

interface ProductOption {
  id: number;
  name: string;
  sku: string;
}

interface ZoneOption {
  id: number;
  name: string;
}

/**
 * OcrValidation Component - Split View cho QA/QC duyệt hóa đơn OCR
 * Layout:
 * - Trái: Upload ảnh + Image Viewer
 * - Phải: Form dữ liệu OCR với viền đỏ cho field nghi ngờ
 */
const OcrValidation: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<RcFile | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [ocrData, setOcrData] = useState<ReceiptOcrDto | null>(null);
  const [items, setItems] = useState<(OcrItemDto & { key: string })[]>([]);
  const [editingKey, setEditingKey] = useState<string>('');
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load danh sách suppliers, products, zones
  React.useEffect(() => {
    loadDataOptions();
  }, []);

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
      console.error('Failed to load data options:', error);
    }
  };

  // Xử lý upload ảnh
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

    // Generate preview
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Gửi ảnh lên Gemini API
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

      // Khởi tạo items với key
      const itemsWithKey = result.items.map((item, idx) => ({
        ...item,
        key: `item_${idx}`,
      }));
      setItems(itemsWithKey);
      message.success('Xử lý OCR thành công!');
    } catch (error: any) {
      message.error(error.message || 'Lỗi xử lý OCR');
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra field có nghi ngờ không
  const isSuspiciousField = (fieldName: string): boolean => {
    if (!ocrData) return false;
    return ocrData.suspiciousFields.includes(fieldName);
  };

  const isItemFieldSuspicious = (itemIndex: number, fieldName: string): boolean => {
    if (!ocrData) return false;
    return ocrData.suspiciousFields.includes(`items[${itemIndex}].${fieldName}`);
  };

  // Table columns cho items
  const columns: ColumnsType<OcrItemDto & { key: string }> = [
    {
      title: 'Tên Sản phẩm',
      dataIndex: 'productName',
      key: 'productName',
      render: (text, _, index) => (
        <span style={isItemFieldSuspicious(index, 'productName') ? { borderBottom: '2px solid red' } : {}}>
          {text}
        </span>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (text, _, index) => (
        <span style={isItemFieldSuspicious(index, 'quantity') ? { borderBottom: '2px solid red' } : {}}>
          {text}
        </span>
      ),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (text, _, index) => (
        <span style={isItemFieldSuspicious(index, 'unitPrice') ? { borderBottom: '2px solid red' } : {}}>
          {text}
        </span>
      ),
    },
    {
      title: 'Độ tin cậy',
      key: 'confidence',
      render: (_, record, index) => {
        const avgConfidence =
          ((record.productNameConfidence || 0) +
            (record.quantityConfidence || 0) +
            (record.unitPriceConfidence || 0)) /
          3;
        return (
          <span style={{ color: avgConfidence < 0.7 ? 'red' : 'green' }}>
            {(avgConfidence * 100).toFixed(0)}%
          </span>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 100,
      render: (_, record, index) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => setEditingKey(record.key)}
            size="small"
          />
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteItem(index)}
            size="small"
          />
        </Space>
      ),
    },
  ];

  const handleDeleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    const newItem: OcrItemDto & { key: string } = {
      productName: '',
      quantity: 0,
      unitPrice: 0,
      key: `item_${Date.now()}`,
    };
    setItems([...items, newItem]);
  };

  const handleSaveReceipt = async () => {
    try {
      const values = await form.validateFields();

      // Validate items
      if (items.length === 0) {
        message.error('Phải có ít nhất 1 sản phẩm!');
        return;
      }

      setLoading(true);

      // Prepare request data
      const request = {
        supplierId: values.supplierId,
        invoiceDate: values.invoiceDate.format('YYYY-MM-DD'),
        items: items.map((item) => ({
          productId: item.productId || 0,
          zoneId: item.zoneId || 0,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        notes: values.notes,
      };

      // Call save API
      await ocrService.saveReceiptFromOcr(request);
      message.success('Lưu phiếu nhập thành công!');

      // Reset form
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

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Duyệt Hóa Đơn OCR</Title>

      <Spin spinning={loading}>
        <Row gutter={24}>
          {/* Left Panel: Upload & Image Viewer */}
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

          {/* Right Panel: Form & Data */}
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
                    {/* Supplier */}
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
                      <Select placeholder="Chọn nhà cung cấp" options={suppliers.map((s) => ({
                        label: s.name,
                        value: s.id,
                      }))} />
                    </Form.Item>

                    {/* Invoice Date */}
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

                    {/* Items Table */}
                    <Table
                      columns={columns}
                      dataSource={items}
                      pagination={false}
                      size="small"
                      style={{ marginBottom: '16px' }}
                    />

                    <Button icon={<PlusOutlined />} onClick={handleAddItem} style={{ marginBottom: '16px' }}>
                      Thêm Sản Phẩm
                    </Button>

                    {/* Notes */}
                    <Form.Item name="notes" label="Ghi Chú">
                      <TextArea rows={3} placeholder="Ghi chú từ QA/QC (nếu có)" />
                    </Form.Item>

                    {/* Action Buttons */}
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button onClick={() => {
                          form.resetFields();
                          setOcrData(null);
                          setItems([]);
                          setImageFile(null);
                          setImagePreview('');
                        }}>
                          Hủy
                        </Button>
                        <Button
                          type="primary"
                          size="large"
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
