import { formatVND } from '../../helpers/formatters';
import React, { useEffect, useState, useCallback } from 'react';
import {
    Modal, Form, Select, InputNumber, Button, Space,
    Tag, Descriptions, Divider, Upload, Image, Row, Col,
    message, Spin, Input, Alert
} from 'antd';
import {
    PlusOutlined, EyeOutlined, CheckCircleOutlined,
    UploadOutlined, RobotOutlined, InboxOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseTable } from '../../components/common/BaseTable';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { receiptService } from '../../services/operationServices';
import { warehouseService } from '../../services/warehouseService';
import { supplierService } from '../../services/supplierService';
import { productService } from '../../services/productService';
import { zoneService } from '../../services/zoneService';
import type { IReceipt, IWarehouse, ISupplier, IProduct, IZone, ReceiptStatus } from '../../types/domain';

const { Option } = Select;
const { Dragger } = Upload;

const STATUS_MAP: Record<ReceiptStatus, { color: string; label: string }> = {
    Draft: { color: 'blue', label: 'Nháp' },
    QC_Checked: { color: 'orange', label: 'Đã duyệt QC' },
    Completed: { color: 'green', label: 'Hoàn thành' },
};

export const ReceiptsPage: React.FC = () => {
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
    const [ocrResult, setOcrResult] = useState<string | null>(null);
    const [ocrFile, setOcrFile] = useState<UploadFile | null>(null);
    const [ocrImageUrl, setOcrImageUrl] = useState<string | null>(null);
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
            warehouseService.list(),
            supplierService.list(),
            productService.list(),
            zoneService.list(),
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
                setOcrResult(JSON.stringify(res.data, null, 2));
            }
        } catch {
            message.error('OCR thất bại.');
        } finally {
            setOcrRunning(false);
        }
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
                    <Button icon={<RobotOutlined />} onClick={() => setOcrModalOpen(true)}>AI OCR Hóa đơn</Button>
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

            {/* Modal AI OCR - Giữ nguyên không đổi */}
            <Modal title={<><RobotOutlined /> AI OCR - Bóc tách Hóa đơn</>}
                open={ocrModalOpen} onCancel={() => { setOcrModalOpen(false); setOcrResult(null); setOcrImageUrl(null); }}
                footer={null} width={900}>
                {/* ... (Phần nội dung Modal OCR giữ nguyên như code cũ của bạn) ... */}
            </Modal>
        </div>
    );
};