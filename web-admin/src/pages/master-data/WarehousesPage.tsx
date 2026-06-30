import React, { useEffect, useState, useCallback } from 'react';
import { Form, Input, message, Space, Button, Modal, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseTable } from '../../components/common/BaseTable';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import type { IWarehouse } from '../../types/domain';
import { warehouseService } from '../../services/warehouseService';

export const WarehousesPage: React.FC = () => {
    const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<IWarehouse | null>(null);
    const [search, setSearch] = useState('');
    const [form] = Form.useForm();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await warehouseService.list(true);
            if (res?.success) setWarehouses(res.data || []);
        } catch { message.error('Không thể tải danh sách kho.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
    const openEdit = (w: IWarehouse) => { setEditing(w); form.setFieldsValue({ name: w.name, location: w.location }); setModalOpen(true); };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            if (editing) {
                await warehouseService.update(editing.id, values);
                message.success('Cập nhật kho thành công!');
            } else {
                await warehouseService.create(values);
                message.success('Tạo kho thành công!');
            }
            setModalOpen(false);
            fetchData();
        } catch { message.error('Thao tác thất bại.'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        await warehouseService.delete(id);
        message.success('Xóa kho thành công!');
        fetchData();
    };

    const filtered = warehouses.filter(w =>
        !search || w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.location.toLowerCase().includes(search.toLowerCase())
    );

    const columns = [
        { title: 'Tên kho', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
        { title: 'Địa chỉ', dataIndex: 'location', key: 'location' },
        {
            title: 'Hành động', key: 'action',
            render: (_: unknown, record: IWarehouse) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>Sửa</Button>
                    <Popconfirm title="Xác nhận xóa kho này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
                        <Button icon={<DeleteOutlined />} size="small" danger>Xóa</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <PageHeader title="Quản lý Kho" subtitle="Tạo và quản lý danh sách kho bãi" />
            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                <Input.Search placeholder="Tìm tên kho, địa chỉ..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 300 }} allowClear />
                <PrimaryButton icon={<PlusOutlined />} onClick={openCreate}>Thêm kho</PrimaryButton>
            </Space>
            <BaseTable columns={columns} dataSource={filtered} rowKey="id" loading={loading} />
            <Modal title={editing ? 'Chỉnh sửa kho' : 'Thêm kho mới'} open={modalOpen} onCancel={() => setModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setModalOpen(false)}>Hủy</Button>,
                    <Button key="save" type="primary" loading={saving} onClick={handleSave}>Lưu</Button>
                ]}>
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Tên kho" rules={[{ required: true, message: 'Nhập tên kho' }]}>
                        <Input placeholder="VD: Kho A - Hà Nội" />
                    </Form.Item>
                    <Form.Item name="location" label="Địa chỉ" rules={[{ required: true, message: 'Nhập địa chỉ' }]}>
                        <Input placeholder="VD: 123 Đường ABC, Quận XYZ" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
