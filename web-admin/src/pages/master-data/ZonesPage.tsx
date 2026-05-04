import React, { useEffect, useState, useCallback } from 'react';
import { Form, Input, Select, message, Space, Button, Modal, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseTable } from '../../components/common/BaseTable';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import type { IZone, IWarehouse } from '../../types/domain';
import { zoneService } from '../../services/zoneService';
import { warehouseService } from '../../services/warehouseService';

const { Option } = Select;

export const ZonesPage: React.FC = () => {
    const [zones, setZones] = useState<IZone[]>([]);
    const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<IZone | null>(null);
    const [filterWarehouse, setFilterWarehouse] = useState<string | undefined>();
    const [form] = Form.useForm();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [zRes, wRes] = await Promise.all([zoneService.list(filterWarehouse), warehouseService.list()]);
            if (zRes?.success) setZones(zRes.data || []);
            if (wRes?.success) setWarehouses(wRes.data || []);
        } catch { message.error('Không thể tải danh sách zone.'); }
        finally { setLoading(false); }
    }, [filterWarehouse]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
    const openEdit = (z: IZone) => { setEditing(z); form.setFieldsValue({ name: z.name, warehouseId: z.warehouseId }); setModalOpen(true); };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            if (editing) {
                await zoneService.update(editing.id, { name: values.name });
                message.success('Cập nhật zone thành công!');
            } else {
                await zoneService.create({ warehouseId: values.warehouseId, name: values.name });
                message.success('Tạo zone thành công!');
            }
            setModalOpen(false);
            fetchData();
        } catch { message.error('Thao tác thất bại.'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        await zoneService.delete(id);
        message.success('Xóa zone thành công!');
        fetchData();
    };

    const columns = [
        { title: 'Tên Zone', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
        { title: 'Kho', dataIndex: 'warehouseName', key: 'warehouseName' },
        {
            title: 'Hành động', key: 'action',
            render: (_: unknown, record: IZone) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>Sửa</Button>
                    <Popconfirm title="Xác nhận xóa zone này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
                        <Button icon={<DeleteOutlined />} size="small" danger>Xóa</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <PageHeader title="Quản lý Zone" subtitle="Phân chia khu vực lưu trữ trong kho" />
            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                <Select placeholder="Lọc theo kho" style={{ width: 200 }} allowClear onChange={setFilterWarehouse}>
                    {warehouses.map(w => <Option key={w.id} value={w.id}>{w.name}</Option>)}
                </Select>
                <PrimaryButton icon={<PlusOutlined />} onClick={openCreate}>Thêm Zone</PrimaryButton>
            </Space>
            <BaseTable columns={columns} dataSource={zones} rowKey="id" loading={loading} />
            <Modal title={editing ? 'Chỉnh sửa Zone' : 'Thêm Zone mới'} open={modalOpen} onCancel={() => setModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setModalOpen(false)}>Hủy</Button>,
                    <Button key="save" type="primary" loading={saving} onClick={handleSave}>Lưu</Button>
                ]}>
                <Form form={form} layout="vertical">
                    {!editing && (
                        <Form.Item name="warehouseId" label="Kho" rules={[{ required: true, message: 'Chọn kho' }]}>
                            <Select placeholder="Chọn kho">
                                {warehouses.map(w => <Option key={w.id} value={w.id}>{w.name}</Option>)}
                            </Select>
                        </Form.Item>
                    )}
                    <Form.Item name="name" label="Tên Zone" rules={[{ required: true, message: 'Nhập tên zone' }]}>
                        <Input placeholder="VD: Zone A - Hàng lạnh" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
