import React, { useEffect, useState, useCallback } from 'react';
import {
    Modal, Form, Select, InputNumber, Button, Space, Tag,
    Descriptions, Divider, Steps, Alert, message, Row, Col, Input,
    Card, Statistic, Progress
} from 'antd';
import {
    PlusOutlined, EyeOutlined, CheckCircleOutlined,
    CarOutlined, EnvironmentOutlined, CheckOutlined
} from '@ant-design/icons';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseTable } from '../../components/common/BaseTable';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { issueService } from '../../services/operationServices';
import { warehouseService } from '../../services/warehouseService';
import { customerService } from '../../services/customerService';
import { productService } from '../../services/productService';
import type { IIssue, IPickingPlan, IWarehouse, ICustomer, IProduct, IssueStatus, IIssueDetail } from '../../types/domain';

const { Option } = Select;

const STATUS_MAP: Record<IssueStatus, { color: string; label: string }> = {
    Pending: { color: 'blue', label: 'Chờ xử lý' },
    Picking: { color: 'orange', label: 'Đang nhặt hàng' },
    Handover: { color: 'green', label: 'Đã bàn giao' },
};

export const IssuesPage: React.FC = () => {
    const [issues, setIssues] = useState<IIssue[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [pickingPlanModalOpen, setPickingPlanModalOpen] = useState(false);
    const [confirmPickOpen, setConfirmPickOpen] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<IIssueDetail | null>(null);
    const [selectedIssue, setSelectedIssue] = useState<IIssue | null>(null);
    const [pickingPlan, setPickingPlan] = useState<IPickingPlan | null>(null);
    const [planLoading, setPlanLoading] = useState(false);
    const [handoverLoading, setHandoverLoading] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
    const [customers, setCustomers] = useState<ICustomer[]>([]);
    const [products, setProducts] = useState<IProduct[]>([]);
    const [details, setDetails] = useState<{ productId: string; quantityToPick: number }[]>([]);
    const [form] = Form.useForm();
    const [pickForm] = Form.useForm();

    const fetchIssues = useCallback(async () => {
        setLoading(true);
        try {
            const res = await issueService.list();
            if (res?.success) {
                setIssues(res.data || []);
                if (selectedIssue) {
                    const updated = res.data?.find(i => i.id === selectedIssue.id);
                    if (updated) setSelectedIssue(updated);
                }
            }
        } catch { message.error('Không thể tải danh sách lệnh xuất.'); }
        finally { setLoading(false); }
    }, [selectedIssue]);

    useEffect(() => {
        fetchIssues();
        const refreshTimer = window.setInterval(() => {
            fetchIssues();
        }, 5000);

        return () => window.clearInterval(refreshTimer);
    }, [fetchIssues]);

    useEffect(() => {
        Promise.all([warehouseService.list(), customerService.list(), productService.list()])
            .then(([wRes, cRes, pRes]) => {
                if (wRes?.success) setWarehouses(wRes.data || []);
                if (cRes?.success) setCustomers(cRes.data || []);
                if (pRes?.success) setProducts(pRes.data || []);
            });
    }, []);

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            setCreating(true);
            const res = await issueService.create({ warehouseId: values.warehouseId, customerId: values.customerId, details });
            if (res?.success) {
                message.success('Tạo lệnh xuất thành công!');
                setCreateModalOpen(false);
                form.resetFields();
                setDetails([]);
                fetchIssues();
            }
        } catch { message.error('Tạo lệnh xuất thất bại.'); }
        finally { setCreating(false); }
    };

    const handleConfirmPick = async () => {
        if (!selectedDetail) return;
        try {
            const { quantity } = await pickForm.validateFields();
            setConfirmLoading(true);
            if (!selectedIssue) { message.error('Không tìm thấy phiếu xuất.'); return; }
            const res = await issueService.confirmPick(selectedIssue.id, {
                issueDetailId: selectedDetail.id,
                pickedQuantity: quantity,
            });
            if (res?.success) {
                message.success(`Xác nhận nhặt ${quantity} sản phẩm thành công!`);
                setConfirmPickOpen(false);
                fetchIssues();
                if (res.data?.status === 'Handover') {
                    message.success('🎉 Tất cả hàng đã nhặt đủ! Phiếu chuyển sang Bàn giao.');
                    setDetailModalOpen(false);
                }
            }
        } catch { message.error('Thao tác thất bại.'); }
        finally { setConfirmLoading(false); }
    };

    const handleGetPickingPlan = async (issueId: string) => {
        setPlanLoading(true);
        try {
            const res = await issueService.getPickingPlan(issueId);
            if (res?.success) {
                setPickingPlan(res.data!);
                setPickingPlanModalOpen(true);
            }
        } catch { message.error('Không thể tạo lộ trình nhặt hàng.'); }
        finally { setPlanLoading(false); }
    };

    const handleHandover = async (id: string) => {
        setHandoverLoading(true);
        try {
            const res = await issueService.handover(id);
            if (res?.success) {
                message.success('Bàn giao vận chuyển thành công!');
                setDetailModalOpen(false);
                fetchIssues();
            }
        } catch { message.error('Thất bại.'); }
        finally { setHandoverLoading(false); }
    };

    const totalPickingUnits = pickingPlan?.items.reduce((sum, item) => sum + item.quantityToPick, 0) ?? 0;
    const pickingZoneCount = new Set(pickingPlan?.items.map(item => item.zoneName) ?? []).size;

    const getLineStatus = (item: { quantityToPick: number; pickedQuantity: number }) => {
        if (item.pickedQuantity >= item.quantityToPick) return { label: 'Đã lấy đủ', color: 'success' as const };
        return { label: 'Đang lấy', color: 'processing' as const };
    };

    const completedLines = selectedIssue?.issueDetails.filter(item => item.pickedQuantity >= item.quantityToPick).length ?? 0;

    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', render: (v: string) => v.substring(0, 8) + '...' },
        { title: 'Kho', dataIndex: 'warehouseName', key: 'warehouseName' },
        { title: 'Khách hàng', dataIndex: 'customerName', key: 'customerName', render: (v?: string) => v || '—' },
        { title: 'Người tạo', dataIndex: 'createdBy', key: 'createdBy' },
        {
            title: 'Trạng thái', dataIndex: 'status', key: 'status',
            render: (s: IssueStatus) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.label || s}</Tag>
        },
        { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => new Date(v).toLocaleDateString('vi-VN') },
        {
            title: 'Hành động', key: 'action',
            render: (_: unknown, record: IIssue) => (
                <Space>
                    <Button icon={<EyeOutlined />} size="small" onClick={() => { setSelectedIssue(record); setDetailModalOpen(true); }}>Xem</Button>
                    {record.status === 'Pending' && (
                        <Button icon={<EnvironmentOutlined />} size="small" type="primary"
                            loading={planLoading} onClick={() => handleGetPickingPlan(record.id)}>
                            Preview lấy hàng
                        </Button>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <PageHeader title="Lệnh Xuất Kho" subtitle="Quản lý lệnh xuất hàng với thuật toán FIFO" />

            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                <Input.Search placeholder="Tìm kiếm..." style={{ width: 250 }} allowClear />
                <PrimaryButton icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>Tạo Lệnh Xuất</PrimaryButton>
            </Space>

            <BaseTable columns={columns} dataSource={issues} rowKey="id" loading={loading} />

            <Modal title="Tạo Lệnh Xuất Kho" open={createModalOpen} onCancel={() => setCreateModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setCreateModalOpen(false)}>Hủy</Button>,
                    <Button key="submit" type="primary" loading={creating} onClick={handleCreate}>Tạo lệnh</Button>
                ]} width={700}>
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="warehouseId" label="Kho xuất" rules={[{ required: true }]}>
                                <Select placeholder="Chọn kho">
                                    {warehouses.map(w => <Option key={w.id} value={w.id}>{w.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="customerId" label="Khách hàng">
                                <Select placeholder="Chọn khách hàng" allowClear>
                                    {customers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Divider>Danh sách cần xuất</Divider>
                    {details.map((d, idx) => (
                        <Row gutter={8} key={idx} style={{ marginBottom: 8 }}>
                            <Col span={14}>
                                <Select style={{ width: '100%' }} value={d.productId} onChange={v => { const nd = [...details]; nd[idx].productId = v; setDetails(nd); }}>
                                    {products.map(p => <Option key={p.id} value={p.id}>{p.name} ({p.sku})</Option>)}
                                </Select>
                            </Col>
                            <Col span={8}>
                                <InputNumber min={1} value={d.quantityToPick} style={{ width: '100%' }}
                                    onChange={v => { const nd = [...details]; nd[idx].quantityToPick = v ?? 1; setDetails(nd); }} />
                            </Col>
                            <Col span={2}>
                                <Button danger onClick={() => setDetails(details.filter((_, i) => i !== idx))}>✕</Button>
                            </Col>
                        </Row>
                    ))}
                    <Button icon={<PlusOutlined />} onClick={() => setDetails([...details, { productId: '', quantityToPick: 1 }])}>
                        Thêm sản phẩm
                    </Button>
                </Form>
            </Modal>

            <Modal title="Chi tiết Lệnh Xuất" open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} width={800}>
                {selectedIssue && (
                    <>
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="Kho">{selectedIssue.warehouseName}</Descriptions.Item>
                            <Descriptions.Item label="Khách hàng">{selectedIssue.customerName || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={STATUS_MAP[selectedIssue.status]?.color}>{STATUS_MAP[selectedIssue.status]?.label}</Tag>
                            </Descriptions.Item>
                        </Descriptions>
                        <Divider>Theo dõi từng dòng xuất kho</Divider>
                        <BaseTable
                            columns={[
                                { title: 'Sản phẩm', dataIndex: 'productName', key: 'productName' },
                                { title: 'Khu vực', dataIndex: 'zoneName', key: 'zoneName', render: (v?: string) => v ? <Tag color="purple">{v}</Tag> : <span style={{ color: '#bbb' }}>—</span> },
                                { title: 'Cần nhặt', dataIndex: 'quantityToPick', key: 'quantityToPick' },
                                { title: 'Đã nhặt', dataIndex: 'pickedQuantity', key: 'pickedQuantity',
                                    render: (v: number, rec: IIssueDetail) => (
                                        <span style={{ color: v >= rec.quantityToPick ? '#52c41a' : '#faad14', fontWeight: 'bold' }}>{v}</span>
                                    )
                                },
                                {
                                    title: 'Tiến độ', key: 'progress',
                                    render: (_: unknown, record: IIssueDetail) => {
                                        const pct = Math.min(100, Math.round((record.pickedQuantity / Math.max(record.quantityToPick, 1)) * 100));
                                        return <Progress percent={pct} size="small" status={record.pickedQuantity >= record.quantityToPick ? 'success' : 'active'} />;
                                    }
                                },
                                {
                                    title: 'Trạng thái', key: 'lineStatus',
                                    render: (_: unknown, record: IIssueDetail) => {
                                        if (record.pickedQuantity >= record.quantityToPick) return <Tag color="success" icon={<CheckCircleOutlined />}>Đã lấy đủ</Tag>;
                                        if (record.pickedQuantity > 0) return <Tag color="orange">Đang lấy ({record.pickedQuantity}/{record.quantityToPick})</Tag>;
                                        return <Tag>Chưa lấy</Tag>;
                                    }
                                },
                                {
                                    title: 'Thao tác', key: 'action',
                                    render: (_: unknown, record: IIssueDetail) => {
                                        const isDone = record.pickedQuantity >= record.quantityToPick;
                                        if (isDone) return null;
                                        return (
                                            <Button icon={<CheckOutlined />} size="small" type="primary"
                                                disabled={selectedIssue?.status !== 'Picking'}
                                                onClick={() => {
                                                    setSelectedDetail(record);
                                                    pickForm.setFieldsValue({ quantity: record.quantityToPick - record.pickedQuantity });
                                                    setConfirmPickOpen(true);
                                                }}>
                                                Nhặt hàng
                                            </Button>
                                        );
                                    }
                                }
                            ]}
                            dataSource={selectedIssue.issueDetails}
                            rowKey="id"
                            pagination={false}
                        />
                        {selectedIssue.status === 'Picking' && (
                            <Button type="primary" danger icon={<CarOutlined />} loading={handoverLoading}
                                style={{ marginTop: 16 }} onClick={() => handleHandover(selectedIssue.id)}>
                                Bàn giao vận chuyển
                            </Button>
                        )}
                    </>
                )}
            </Modal>

            {/* WMSF-218: Modal xác nhận số lượng nhặt hàng */}
            <Modal
                title={<Space><CheckOutlined style={{ color: '#52c41a' }} /><span>Xác nhận nhặt hàng</span></Space>}
                open={confirmPickOpen}
                onCancel={() => { setConfirmPickOpen(false); setSelectedDetail(null); }}
                onOk={handleConfirmPick}
                confirmLoading={confirmLoading}
                okText="Xác nhận nhặt"
                cancelText="Hủy"
                width={440}
            >
                {selectedDetail && (
                    <div>
                        <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="Sản phẩm">
                                <strong>{selectedDetail.productName}</strong>
                            </Descriptions.Item>
                            <Descriptions.Item label="Barcode">
                                <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{selectedDetail.productBarcode}</code>
                            </Descriptions.Item>
                            {selectedDetail.zoneName && (
                                <Descriptions.Item label="Khu vực">
                                    <Tag color="purple">{selectedDetail.zoneName}</Tag>
                                </Descriptions.Item>
                            )}
                            <Descriptions.Item label="Tiến độ hiện tại">
                                <Progress
                                    percent={Math.round((selectedDetail.pickedQuantity / Math.max(selectedDetail.quantityToPick, 1)) * 100)}
                                    size="small"
                                    format={() => `${selectedDetail.pickedQuantity} / ${selectedDetail.quantityToPick}`}
                                />
                            </Descriptions.Item>
                        </Descriptions>
                        <Form form={pickForm} layout="vertical">
                            <Form.Item
                                name="quantity"
                                label={`Số lượng thực tế nhặt lần này (còn lại: ${selectedDetail.quantityToPick - selectedDetail.pickedQuantity})`}
                                rules={[
                                    { required: true, message: 'Vui lòng nhập số lượng' },
                                    { type: 'number', min: 1, message: 'Số lượng phải ≥ 1' },
                                    { type: 'number', max: selectedDetail.quantityToPick - selectedDetail.pickedQuantity, message: 'Không vượt quá số còn lại' },
                                ]}
                            >
                                <InputNumber
                                    id="pickQuantityInput"
                                    min={1}
                                    max={selectedDetail.quantityToPick - selectedDetail.pickedQuantity}
                                    style={{ width: '100%' }}
                                    size="large"
                                    autoFocus
                                />
                            </Form.Item>
                        </Form>
                    </div>
                )}
            </Modal>

            <Modal title={<><EnvironmentOutlined /> Preview hệ thống gợi ý lấy hàng</>}
                open={pickingPlanModalOpen} onCancel={() => setPickingPlanModalOpen(false)} footer={null} width={860}>
                {pickingPlan && (
                    <>
                        <Alert message="Hệ thống ưu tiên khu vực có hàng nhập sớm nhất (FIFO) để giảm thời gian đi lại của thủ kho." type="info" showIcon />
                        <Row gutter={16} style={{ marginTop: 16 }}>
                            <Col span={8}>
                                <Card>
                                    <Statistic title="Tổng sản phẩm cần lấy" value={totalPickingUnits} suffix="sp" />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card>
                                    <Statistic title="Số khu vực gợi ý" value={pickingZoneCount} suffix="zone" />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card>
                                    <Statistic title="Số dòng lộ trình" value={pickingPlan.items.length} suffix="bước" />
                                </Card>
                            </Col>
                        </Row>

                        <Divider>Đường đi đề xuất</Divider>
                        <Steps
                            direction="vertical"
                            size="small"
                            items={pickingPlan.items.map((item, idx) => ({
                                key: idx,
                                title: <strong>ĐẾN {item.zoneName.toUpperCase()} — Lấy {item.quantityToPick} sản phẩm</strong>,
                                description: (
                                    <Space direction="vertical" size="small">
                                        <span><Tag>{item.productName}</Tag> | Barcode: {item.productBarcode}</span>
                                        <span>Nhập lúc: {new Date(item.restockedDate).toLocaleDateString('vi-VN')}</span>
                                    </Space>
                                ),
                                status: 'process' as const
                            }))}
                        />

                        <Divider>Preview theo từng mặt hàng</Divider>
                        <BaseTable
                            columns={[
                                { title: 'Khu vực', dataIndex: 'zoneName', key: 'zoneName' },
                                { title: 'Sản phẩm', dataIndex: 'productName', key: 'productName' },
                                { title: 'Barcode', dataIndex: 'productBarcode', key: 'productBarcode' },
                                { title: 'Số lượng', dataIndex: 'quantityToPick', key: 'quantityToPick' },
                                { title: 'Nhập trước', dataIndex: 'restockedDate', key: 'restockedDate', render: (v: string) => new Date(v).toLocaleDateString('vi-VN') },
                            ]}
                            dataSource={pickingPlan.items}
                            rowKey="issueDetailId"
                            pagination={false}
                        />
                    </>
                )}
            </Modal>
        </div>
    );
};
