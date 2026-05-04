import React, { useEffect, useState, useCallback } from 'react';
import {
    Modal, Form, Select, InputNumber, Button, Space, Tag,
    Descriptions, Divider, Steps, Alert, message, Row, Col, Input
} from 'antd';
import {
    PlusOutlined, EyeOutlined, CheckCircleOutlined,
    CarOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseTable } from '../../components/common/BaseTable';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { issueService } from '../../services/operationServices';
import { warehouseService } from '../../services/warehouseService';
import { customerService } from '../../services/customerService';
import { productService } from '../../services/productService';
import type { IIssue, IPickingPlan, IWarehouse, ICustomer, IProduct, IssueStatus } from '../../types/domain';

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
    const [selectedIssue, setSelectedIssue] = useState<IIssue | null>(null);
    const [pickingPlan, setPickingPlan] = useState<IPickingPlan | null>(null);
    const [planLoading, setPlanLoading] = useState(false);
    const [handoverLoading, setHandoverLoading] = useState(false);
    const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
    const [customers, setCustomers] = useState<ICustomer[]>([]);
    const [products, setProducts] = useState<IProduct[]>([]);
    const [details, setDetails] = useState<{ productId: string; quantityToPick: number }[]>([]);
    const [form] = Form.useForm();

    const fetchIssues = useCallback(async () => {
        setLoading(true);
        try {
            const res = await issueService.list();
            if (res?.success) setIssues(res.data || []);
        } catch { message.error('Không thể tải danh sách lệnh xuất.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchIssues();
        Promise.all([warehouseService.list(), customerService.list(), productService.list()])
            .then(([wRes, cRes, pRes]) => {
                if (wRes?.success) setWarehouses(wRes.data || []);
                if (cRes?.success) setCustomers(cRes.data || []);
                if (pRes?.success) setProducts(pRes.data || []);
            });
    }, [fetchIssues]);

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
                            Lộ trình FIFO
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

            {/* Modal Tạo lệnh xuất */}
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

            {/* Modal Chi tiết lệnh xuất */}
            <Modal title="Chi tiết Lệnh Xuất" open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} width={700}>
                {selectedIssue && (
                    <>
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="Kho">{selectedIssue.warehouseName}</Descriptions.Item>
                            <Descriptions.Item label="Khách hàng">{selectedIssue.customerName || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={STATUS_MAP[selectedIssue.status]?.color}>{STATUS_MAP[selectedIssue.status]?.label}</Tag>
                            </Descriptions.Item>
                        </Descriptions>
                        <Divider>Chi tiết</Divider>
                        <BaseTable
                            columns={[
                                { title: 'Sản phẩm', dataIndex: 'productName', key: 'productName' },
                                { title: 'Cần nhặt', dataIndex: 'quantityToPick', key: 'quantityToPick' },
                                { title: 'Đã nhặt', dataIndex: 'pickedQuantity', key: 'pickedQuantity' },
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

            {/* Modal Lộ trình FIFO Picking */}
            <Modal title={<><EnvironmentOutlined /> Lộ trình nhặt hàng FIFO</>}
                open={pickingPlanModalOpen} onCancel={() => setPickingPlanModalOpen(false)} footer={null} width={700}>
                {pickingPlan && (
                    <>
                        <Alert message="Thuật toán FIFO: Hàng nhập trước được xuất trước. Đi theo lộ trình dưới đây." type="info" showIcon style={{ marginBottom: 16 }} />
                        <Steps 
                            direction="vertical" 
                            size="small" 
                            items={pickingPlan.items.map((item, idx) => ({
                                key: idx,
                                title: <><strong style={{ fontSize: 16 }}>ĐẾN {item.zoneName.toUpperCase()}</strong> — Lấy {item.quantityToPick} sản phẩm</>,
                                description: <><Tag>{item.productName}</Tag> | Barcode: {item.productBarcode} | Nhập lúc: {new Date(item.restockedDate).toLocaleDateString('vi-VN')}</>,
                                status: "process" as const
                            }))}
                        />
                    </>
                )}
            </Modal>
        </div>
    );
};
