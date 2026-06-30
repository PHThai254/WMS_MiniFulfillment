import { formatVND } from '../../helpers/formatters';
import React, { useEffect, useState, useCallback } from 'react';
import {
    Modal, Form, Select, InputNumber, Button, Space,
    Tag, Descriptions, Divider, Upload, Image, Row, Col,
    message, Spin, Input, Alert, Table, Badge
} from 'antd';
import {
    PlusOutlined, EyeOutlined, CheckCircleOutlined,
    UploadOutlined, RobotOutlined, InboxOutlined, WarningOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import type { IOcrResult, IOcrLineItem } from '../../types/domain';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseTable } from '../../components/common/BaseTable';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { receiptService } from '../../services/operationServices';
import { warehouseService } from '../../services/warehouseService';
import { supplierService } from '../../services/supplierService';
import { productService } from '../../services/productService';
import { zoneService } from '../../services/zoneService';
// FIX BUG 3: Import useAuth để kiểm tra quyền động
import { useAuth } from '../../hooks/useAuth';
import type { IReceipt, IWarehouse, ISupplier, IProduct, IZone, ReceiptStatus } from '../../types/domain';

const { Option } = Select;
const { Dragger } = Upload;

const STATUS_MAP: Record<ReceiptStatus, { color: string; label: string }> = {
    Draft: { color: 'blue', label: 'Nháp' },
    QC_Checked: { color: 'orange', label: 'Đã duyệt QC' },
    Completed: { color: 'green', label: 'Hoàn thành' },
};

export const ReceiptsPage: React.FC = () => {
    // FIX BUG 3: Lấy hasPermission để kiểm tra quyền hiển thị UI
    const { hasPermission } = useAuth();
    const [receipts, setReceipts] = useState<IReceipt[]>([]);
    const [loading, setLoading] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [ocrModalOpen, setOcrModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<IReceipt | null>(null);
    const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
    const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
    const [products, setProducts] = useState<IProduct[]>([]);
    const [zones, setZones] = useState<IZone[]>([]);
    const [creating, setCreating] = useState(false);
    const [approving, setApproving] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [ocrRunning, setOcrRunning] = useState(false);
    // ocrData: null = Phase 1 (Upload), có giá trị = Phase 2 (Validation)
    const [ocrData, setOcrData] = useState<IOcrResult | null>(null);
    const [ocrFile, setOcrFile] = useState<UploadFile | null>(null);
    const [ocrImageUrl, setOcrImageUrl] = useState<string | null>(null);
    // Phase 2: mảng rows để user map OCR item → Product / Zone / NCC
    const [ocrMappedRows, setOcrMappedRows] = useState<
        { productId: string; zoneId: string; supplierId: string; quantity: number; isLowConfidence: boolean; productNameOcr: string }[]
    >();
    const [form] = Form.useForm();
    const [approveForm] = Form.useForm();
    
    // BỔ SUNG unitPrice ĐỂ LƯU ĐƠN GIÁ NHẬP
    const [details, setDetails] = useState<{ productId: string; expectedQuantity: number; unitPrice: number }[]>([]);

    const fetchReceipts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await receiptService.list();
            if (res?.success) setReceipts(res.data || []);
        } catch {
            message.error('Không thể tải danh sách phiếu nhập.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReceipts();
        Promise.all([
            warehouseService.list(true),
            supplierService.list(),
            productService.list(undefined, undefined),
            zoneService.list(undefined, true),
        ]).then(([wRes, sRes, pRes, zRes]) => {
            if (wRes?.success) setWarehouses(wRes.data || []);
            if (sRes?.success) setSuppliers(sRes.data || []);
            if (pRes?.success) setProducts(pRes.data || []);
            if (zRes?.success) setZones(zRes.data || []);
        });
    }, [fetchReceipts]);

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            setCreating(true);
            const res = await receiptService.create({
                warehouseId: values.warehouseId,
                supplierId: values.supplierId,
                details, // details giờ đã bao gồm cả unitPrice
            });
            if (res?.success) {
                message.success('Tạo phiếu nhập thành công!');
                setCreateModalOpen(false);
                form.resetFields();
                setDetails([]);
                fetchReceipts();
            }
        } catch {
            message.error('Tạo phiếu nhập thất bại.');
        } finally {
            setCreating(false);
        }
    };

    const handleApproveQc = async (receipt: IReceipt) => {
        try {
            const values = await approveForm.validateFields();
            setApproving(true);
            const detailsData = receipt.receiptDetails.map(d => ({
                detailId: d.id,
                actualQuantity: values[`qty_${d.id}`] ?? d.expectedQuantity,
                zoneId: values[`zone_${d.id}`],
            }));
            const res = await receiptService.approveQc(receipt.id, { details: detailsData });
            if (res?.success) {
                message.success('Duyệt QC thành công!');
                setDetailModalOpen(false);
                fetchReceipts();
            }
        } catch {
            message.error('Duyệt QC thất bại.');
        } finally {
            setApproving(false);
        }
    };

    const handleCompletePutaway = async (id: string) => {
        setCompleting(true);
        try {
            const res = await receiptService.completePutaway(id);
            if (res?.success) {
                message.success('Hoàn thành cất hàng! Tồn kho đã được cập nhật.');
                setDetailModalOpen(false);
                fetchReceipts();
            }
        } catch {
            message.error('Thất bại.');
        } finally {
            setCompleting(false);
        }
    };

    const handleOcr = async () => {
        if (!ocrFile?.originFileObj) return;
        setOcrRunning(true);
        try {
            const formData = new FormData();
            formData.append('image', ocrFile.originFileObj as File);
            const res = await receiptService.runOcr(formData);
            if (res?.success && res.data) {
                // Lưu IOcrResult, không stringify — Phase 2 dùng .items[]
                setOcrData(res.data);
                // Khởi tạo mapped rows từ items OCR trả về
                setOcrMappedRows(
                    res.data.items.map((item: IOcrLineItem) => ({
                        productId: '',
                        zoneId: '',
                        supplierId: '',
                        quantity: item.quantity,
                        isLowConfidence: item.isLowConfidence,
                        productNameOcr: item.productName,
                    }))
                );
            }
        } catch {
            message.error('OCR thất bại. Vui lòng thử lại.');
        } finally {
            setOcrRunning(false);
        }
    };

    /** Xử lý submit Phase 2: Tạo phiếu nhập từ kết quả OCR đã được user map */
    const handleOcrSubmit = async () => {
        if (!ocrMappedRows || ocrMappedRows.length === 0) {
            message.warning('Chưa có dữ liệu để tạo phiếu nhập.');
            return;
        }
        const invalidRow = ocrMappedRows.find(r => !r.productId || !r.zoneId);
        if (invalidRow) {
            message.error(`Vui lòng chọn Sản phẩm và Zone cho dòng "${invalidRow.productNameOcr}".`);
            return;
        }
        message.info('Chức năng tạo phiếu từ OCR đang phát triển (Human-in-the-loop confirmed).');
    };

    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', render: (v: string) => v.substring(0, 8) + '...' },
        { title: 'Kho', dataIndex: 'warehouseName', key: 'warehouseName' },
        { title: 'Nhà cung cấp', dataIndex: 'supplierName', key: 'supplierName', render: (v?: string) => v || '—' },
        { title: 'Người tạo', dataIndex: 'createdBy', key: 'createdBy' },
        {
            title: 'Trạng thái', dataIndex: 'status', key: 'status',
            render: (s: ReceiptStatus) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.label || s}</Tag>
        },
        { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => new Date(v).toLocaleDateString('vi-VN') },
        {
            title: 'Hành động', key: 'action',
            render: (_: unknown, record: IReceipt) => (
                <Space>
                    <Button icon={<EyeOutlined />} size="small" onClick={() => { setSelectedReceipt(record); setDetailModalOpen(true); approveForm.resetFields(); }}>
                        Xem
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <PageHeader title="Phiếu Nhập Kho" subtitle="Quản lý quy trình nhập kho và AI OCR" />

            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                <Space>
                    <Input.Search placeholder="Tìm kiếm..." style={{ width: 250 }} allowClear />
                </Space>
                <Space>
                    {/* FIX BUG 3: Chỉ hiển nút OCR nếu user có quyền 'run_ocr' - kiểm tra bằng permission code, không dùng hardcode Role */}
                    {hasPermission('run_ocr') && (
                        <Button icon={<RobotOutlined />} onClick={() => setOcrModalOpen(true)}>AI OCR Hóa đơn</Button>
                    )}
                    <PrimaryButton icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>Tạo Phiếu Nhập</PrimaryButton>
                </Space>
            </Space>

            <BaseTable columns={columns} dataSource={receipts} rowKey="id" loading={loading} />

            {/* Modal Tạo phiếu nhập */}
            <Modal title="Tạo Phiếu Nhập Kho" open={createModalOpen} onCancel={() => setCreateModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setCreateModalOpen(false)}>Hủy</Button>,
                    <Button key="submit" type="primary" loading={creating} onClick={handleCreate}>Tạo phiếu</Button>
                ]} width={850}>
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="warehouseId" label="Kho nhập" rules={[{ required: true, message: 'Chọn kho' }]}>
                                <Select placeholder="Chọn kho">
                                    {warehouses.map(w => <Option key={w.id} value={w.id}>{w.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="supplierId" label="Nhà cung cấp">
                                <Select placeholder="Chọn nhà cung cấp" allowClear>
                                    {suppliers.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Divider>Danh sách hàng hóa</Divider>
                    
                    {/* TIÊU ĐỀ CỘT CHO FORM CHI TIẾT */}
                    <Row gutter={8} style={{ marginBottom: 8, fontWeight: 'bold' }}>
                        <Col span={8}>Sản phẩm</Col>
                        <Col span={5}>Số lượng</Col>
                        <Col span={5}>Đơn giá nhập</Col>
                        <Col span={4}>Thành tiền</Col>
                        <Col span={2}></Col>
                    </Row>

                    {details.map((d, idx) => (
                        <Row gutter={8} key={idx} style={{ marginBottom: 8, alignItems: 'center' }}>
                            <Col span={8}>
                                <Select 
                                    style={{ width: '100%' }} 
                                    value={d.productId} 
                                    onChange={v => { 
                                        const nd = [...details]; 
                                        nd[idx].productId = v; 
                                        // Tự động lấy giá mặc định của sản phẩm
                                        const selectedProduct = products.find(p => p.id === v);
                                        nd[idx].unitPrice = selectedProduct?.price || 0;
                                        setDetails(nd); 
                                    }}
                                >
                                    {products.map(p => <Option key={p.id} value={p.id}>{p.name} ({p.sku})</Option>)}
                                </Select>
                            </Col>
                            <Col span={5}>
                                <InputNumber min={1} value={d.expectedQuantity} style={{ width: '100%' }}
                                    onChange={v => { const nd = [...details]; nd[idx].expectedQuantity = v ?? 1; setDetails(nd); }} />
                            </Col>
                            <Col span={5}>
                                <InputNumber 
                                    min={0} 
                                    value={d.unitPrice} 
                                    style={{ width: '100%' }}
                                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
                                    onChange={v => { const nd = [...details]; nd[idx].unitPrice = v ?? 0; setDetails(nd); }} 
                                />
                            </Col>
                            <Col span={4}>
                                <span style={{ color: '#1677ff', fontWeight: 'bold' }}>
                                    {formatVND(d.expectedQuantity * d.unitPrice)}
                                </span>
                            </Col>
                            <Col span={2}>
                                <Button danger onClick={() => setDetails(details.filter((_, i) => i !== idx))}>✕</Button>
                            </Col>
                        </Row>
                    ))}
                    <Button icon={<PlusOutlined />} onClick={() => setDetails([...details, { productId: '', expectedQuantity: 1, unitPrice: 0 }])}>
                        Thêm sản phẩm
                    </Button>
                </Form>
            </Modal>

            {/* Modal Chi tiết phiếu nhập */}
            <Modal title="Chi tiết Phiếu Nhập" open={detailModalOpen} onCancel={() => setDetailModalOpen(false)}
                footer={null} width={900}>
                {selectedReceipt && (
                    <>
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="Kho">{selectedReceipt.warehouseName}</Descriptions.Item>
                            <Descriptions.Item label="Nhà cung cấp">{selectedReceipt.supplierName || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={STATUS_MAP[selectedReceipt.status]?.color}>{STATUS_MAP[selectedReceipt.status]?.label}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Người tạo">{selectedReceipt.createdBy}</Descriptions.Item>
                        </Descriptions>
                        <Divider>Chi tiết hàng hóa</Divider>
                        
                        <Row gutter={8} style={{ marginBottom: 16, fontWeight: 'bold', borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                            <Col span={8}>Sản phẩm</Col>
                            <Col span={4}>SL Dự kiến</Col>
                            {/* Chú ý: Ở đây giả định DTO trả về có trường unitPrice. Nếu Backend chưa có, bạn cần nhờ nhóm cập nhật nhé */}
                            <Col span={4}>Đơn giá</Col> 
                            <Col span={8}>Thực tế & Vị trí cất (Zone)</Col>
                        </Row>

                        {selectedReceipt.status === 'Draft' && (
                            <>
                                <Alert message="QA/QC: Kiểm tra số lượng thực tế và chỉ định Zone cất hàng" type="info" showIcon style={{ marginBottom: 16 }} />
                                <Form form={approveForm} layout="vertical">
                                    {selectedReceipt.receiptDetails.map(d => (
                                        <Row gutter={8} key={d.id} style={{ marginBottom: 16, alignItems: 'center' }}>
                                            <Col span={8}><strong>{d.productName}</strong><br /><small>{d.productBarcode}</small></Col>
                                            <Col span={4}>
                                                <Tag color="blue">{d.expectedQuantity}</Tag>
                                            </Col>
                                            <Col span={4}>
                                                {/* Hiển thị giá và tính thành tiền tạm tính */}
                                                <span style={{ color: '#888' }}>{formatVND(d.unitPrice || 0)}</span>
                                            </Col>
                                            <Col span={4}>
                                                <Form.Item name={`qty_${d.id}`} initialValue={d.expectedQuantity} style={{ margin: 0 }}>
                                                    <InputNumber min={0} placeholder="Thực tế" style={{ width: '100%' }} />
                                                </Form.Item>
                                            </Col>
                                            <Col span={4}>
                                                <Form.Item name={`zone_${d.id}`} style={{ margin: 0 }}>
                                                    <Select placeholder="Chọn Zone" allowClear>
                                                        {zones.filter(z => z.warehouseId === selectedReceipt.warehouseId).map(z => <Option key={z.id} value={z.id}>{z.name}</Option>)}
                                                    </Select>
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    ))}
                                </Form>
                                <Button type="primary" loading={approving} icon={<CheckCircleOutlined />} onClick={() => handleApproveQc(selectedReceipt)}>
                                    Duyệt QC & Lưu
                                </Button>
                            </>
                        )}
                        {selectedReceipt.status === 'QC_Checked' && (
                            <Button type="primary" loading={completing} icon={<InboxOutlined />}
                                onClick={() => handleCompletePutaway(selectedReceipt.id)}>
                                Hoàn thành Put-away (Cập nhật tồn kho)
                            </Button>
                        )}
                        {selectedReceipt.status === 'Completed' && (
                            <Alert message="Phiếu nhập đã hoàn thành. Tồn kho đã được cập nhật." type="success" showIcon />
                        )}
                    </>
                )}
            </Modal>

            {/* ===================== Modal AI OCR ===================== */}
            <Modal
                title={<Space><RobotOutlined style={{ color: '#722ed1' }} /><span>AI OCR – Bóc tách Hóa đơn</span></Space>}
                open={ocrModalOpen}
                onCancel={() => {
                    setOcrModalOpen(false);
                    setOcrData(null);
                    setOcrMappedRows(undefined);
                    setOcrFile(null);
                    setOcrImageUrl(null);
                }}
                footer={null}
                width={960}
                destroyOnClose
            >
                {/* ─────────── PHASE 1: Upload ─────────── */}
                {!ocrData && (
                    <div style={{ padding: '16px 0' }}>
                        <Alert
                            message="Tải lên ảnh hóa đơn để AI tự động nhận dạng sản phẩm và số lượng."
                            description="Định dạng hỗ trợ: JPG, PNG, WEBP. Độ phân giải tốt nhất ≥ 1 MP."
                            type="info"
                            showIcon
                            style={{ marginBottom: 24 }}
                        />

                        {/* Khu vực Dragger upload */}
                        <Upload.Dragger
                            name="file"
                            accept="image/*"
                            maxCount={1}
                            showUploadList={false}
                            beforeUpload={(file) => {
                                // Lưu file vào state, không upload ngay (manual submit)
                                const uploadFile: UploadFile = {
                                    uid: '-1',
                                    name: file.name,
                                    status: 'done',
                                    originFileObj: file,
                                };
                                setOcrFile(uploadFile);
                                // Tạo preview URL
                                const url = URL.createObjectURL(file);
                                setOcrImageUrl(url);
                                return false; // chặn auto upload
                            }}
                            style={{ marginBottom: 16 }}
                        >
                            {ocrImageUrl ? (
                                // Preview ảnh sau khi chọn
                                <div style={{ padding: 8 }}>
                                    <Image
                                        src={ocrImageUrl}
                                        alt="preview"
                                        style={{ maxHeight: 280, objectFit: 'contain' }}
                                        preview={false}
                                    />
                                    <p style={{ marginTop: 8, color: '#555' }}>
                                        {ocrFile?.name} — <span style={{ color: '#722ed1' }}>Click/kéo thả để đổi ảnh</span>
                                    </p>
                                </div>
                            ) : (
                                <div style={{ padding: '32px 0' }}>
                                    <p className="ant-upload-drag-icon">
                                        <InboxOutlined style={{ fontSize: 48, color: '#722ed1' }} />
                                    </p>
                                    <p className="ant-upload-text">Click hoặc kéo thả ảnh hóa đơn vào đây</p>
                                    <p className="ant-upload-hint">Hỗ trợ JPG, PNG, WEBP – tối đa 10 MB</p>
                                </div>
                            )}
                        </Upload.Dragger>

                        <div style={{ textAlign: 'right' }}>
                            <Button
                                type="primary"
                                icon={<RobotOutlined />}
                                size="large"
                                loading={ocrRunning}
                                disabled={!ocrFile}
                                onClick={handleOcr}
                                style={{ background: '#722ed1', borderColor: '#722ed1' }}
                            >
                                {ocrRunning ? 'Đang bóc tách...' : 'Bắt đầu bóc tách'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ─────────── PHASE 2: Validation – Split View ─────────── */}
                {ocrData && ocrMappedRows && (
                    <Row gutter={16} style={{ minHeight: 400 }}>
                        {/* Bên TRÁI: Ảnh hóa đơn với scroll & zoom-hint */}
                        <Col span={10} style={{ borderRight: '1px solid #f0f0f0', paddingRight: 16 }}>
                            <div style={{ position: 'sticky', top: 0 }}>
                                <p style={{ fontWeight: 600, marginBottom: 8 }}>📄 Ảnh hóa đơn gốc</p>
                                {ocrImageUrl ? (
                                    <Image
                                        src={ocrImageUrl}
                                        alt="invoice"
                                        style={{ width: '100%', borderRadius: 8, border: '1px solid #d9d9d9' }}
                                    />
                                ) : (
                                    <Alert message="Không có ảnh preview." type="warning" showIcon />
                                )}
                                {ocrData.hasLowConfidence && (
                                    <Alert
                                        icon={<WarningOutlined />}
                                        message="Một số dòng có độ tin cậy thấp (viền đỏ). Vui lòng kiểm tra kỹ."
                                        type="warning"
                                        showIcon
                                        style={{ marginTop: 12 }}
                                    />
                                )}
                            </div>
                        </Col>

                        {/* Bên PHẢI: Bảng mapping OCR items → Master Data */}
                        <Col span={14}>
                            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontWeight: 600 }}>🗂 Map dữ liệu OCR ({ocrMappedRows.length} dòng)</span>
                                <Button size="small" onClick={() => { setOcrData(null); setOcrMappedRows(undefined); }}>
                                    ← Bóc tách lại
                                </Button>
                            </Space>

                            {ocrMappedRows.map((row, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        marginBottom: 16,
                                        padding: 12,
                                        borderRadius: 8,
                                        // Viền đỏ cảnh báo cho dòng low-confidence
                                        border: row.isLowConfidence
                                            ? '2px solid #ff4d4f'
                                            : '1px solid #f0f0f0',
                                        background: row.isLowConfidence ? '#fff2f0' : '#fafafa',
                                    }}
                                >
                                    <Space style={{ marginBottom: 6 }}>
                                        {row.isLowConfidence && <Badge status="error" text="Độ tin cậy thấp" />}
                                        <span style={{ fontWeight: 500, color: '#555' }}>
                                            OCR đọc được: <em>"{row.productNameOcr}"</em>
                                        </span>
                                    </Space>

                                    <Row gutter={8}>
                                        {/* Dropdown chọn Sản phẩm */}
                                        <Col span={11}>
                                            <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Sản phẩm *</div>
                                            <Select
                                                showSearch
                                                placeholder="Chọn sản phẩm"
                                                style={{ width: '100%' }}
                                                value={row.productId || undefined}
                                                optionFilterProp="label"
                                                onChange={(val: string) => {
                                                    const next = [...ocrMappedRows];
                                                    next[idx].productId = val;
                                                    setOcrMappedRows(next);
                                                }}
                                            >
                                                {products.map(p => (
                                                    <Option key={p.id} value={p.id} label={`${p.name} (${p.sku})`}>
                                                        {p.name} <span style={{ color: '#aaa' }}>({p.sku})</span>
                                                    </Option>
                                                ))}
                                            </Select>
                                        </Col>

                                        {/* Dropdown chọn Zone */}
                                        <Col span={8}>
                                            <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Zone *</div>
                                            <Select
                                                placeholder="Chọn zone"
                                                style={{ width: '100%' }}
                                                value={row.zoneId || undefined}
                                                onChange={(val: string) => {
                                                    const next = [...ocrMappedRows];
                                                    next[idx].zoneId = val;
                                                    setOcrMappedRows(next);
                                                }}
                                            >
                                                {zones.map(z => (
                                                    <Option key={z.id} value={z.id}>
                                                        {z.name}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </Col>

                                        {/* Số lượng (pre-filled từ OCR) */}
                                        <Col span={5}>
                                            <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Số lượng</div>
                                            <InputNumber
                                                min={1}
                                                value={row.quantity}
                                                style={{ width: '100%' }}
                                                onChange={(val) => {
                                                    const next = [...ocrMappedRows];
                                                    next[idx].quantity = val ?? 1;
                                                    setOcrMappedRows(next);
                                                }}
                                            />
                                        </Col>
                                    </Row>

                                    {/* Dropdown chọn Nhà cung cấp (optional) */}
                                    <Row style={{ marginTop: 8 }}>
                                        <Col span={24}>
                                            <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Nhà cung cấp (tuỳ chọn)</div>
                                            <Select
                                                showSearch
                                                allowClear
                                                placeholder="Chọn nhà cung cấp"
                                                style={{ width: '100%' }}
                                                value={row.supplierId || undefined}
                                                optionFilterProp="children"
                                                onChange={(val: string) => {
                                                    const next = [...ocrMappedRows];
                                                    next[idx].supplierId = val ?? '';
                                                    setOcrMappedRows(next);
                                                }}
                                            >
                                                {suppliers.map(s => (
                                                    <Option key={s.id} value={s.id}>{s.name}</Option>
                                                ))}
                                            </Select>
                                        </Col>
                                    </Row>
                                </div>
                            ))}

                            <Divider style={{ margin: '12px 0' }} />
                            <div style={{ textAlign: 'right' }}>
                                <Space>
                                    <Button onClick={() => { setOcrData(null); setOcrMappedRows(undefined); }}>
                                        Hủy
                                    </Button>
                                    <Button
                                        type="primary"
                                        icon={<CheckCircleOutlined />}
                                        onClick={handleOcrSubmit}
                                        style={{ background: '#722ed1', borderColor: '#722ed1' }}
                                    >
                                        Xác nhận &amp; Tạo phiếu nhập
                                    </Button>
                                </Space>
                            </div>
                        </Col>
                    </Row>
                )}
            </Modal>
        </div>
    );
};