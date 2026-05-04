import React, { useEffect, useState, useCallback } from 'react';
import { Form, Input, message, Space, Button, Modal, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseTable } from '../../components/common/BaseTable';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import type { ICustomer } from '../../types/domain';
import { customerService } from '../../services/customerService';

export const CustomersPage: React.FC = () => {
    const [customers, setCustomers] = useState<ICustomer[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ICustomer | null>(null);
    const [search, setSearch] = useState('');
    const [form] = Form.useForm();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await customerService.list();
            if (res?.success) setCustomers(res.data || []);
        } catch { message.error('Không thể tải khách hàng.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
    const openEdit = (c: ICustomer) => { setEditing(c); form.setFieldsValue({ name: c.name, phone: c.phone, deliveryAddress: c.deliveryAddress }); setModalOpen(true); };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            if (editing) {
                await customerService.update(editing.id, values);
                message.success('Cập nhật khách hàng thành công!');
            } else {
                await customerService.create(values);
                message.success('Tạo khách hàng thành công!');
            }
            setModalOpen(false);
            fetchData();
        } catch { message.error('Thao tác thất bại.'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        await customerService.delete(id);
        message.success('Xóa khách hàng thành công!');
        fetchData();
    };

    const filtered = customers.filter(c =>
        !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search))
    );

    const columns = [
        { title: 'Tên khách hàng', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
        { title: 'Điện thoại', dataIndex: 'phone', key: 'phone' },
        { title: 'Địa chỉ giao hàng', dataIndex: 'deliveryAddress', key: 'deliveryAddress' },
        {
            title: 'Hành động', key: 'action',
            render: (_: unknown, record: ICustomer) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>Sửa</Button>
                    <Popconfirm title="Xác nhận xóa khách hàng này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
                        <Button icon={<DeleteOutlined />} size="small" danger>Xóa</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <PageHeader title="Quản lý Khách hàng" subtitle="Danh sách khách hàng nhận hàng xuất kho" />
            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                <Input.Search placeholder="Tìm tên, SĐT..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 300 }} allowClear />
                <PrimaryButton icon={<PlusOutlined />} onClick={openCreate}>Thêm Khách hàng</PrimaryButton>
            </Space>
            <BaseTable columns={columns} dataSource={filtered} rowKey="id" loading={loading} />
            <Modal title={editing ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'} open={modalOpen} onCancel={() => setModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setModalOpen(false)}>Hủy</Button>,
                    <Button key="save" type="primary" loading={saving} onClick={handleSave}>Lưu</Button>
                ]}>
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Tên khách hàng" rules={[{ required: true, message: 'Nhập tên khách hàng' }]}>
                        <Input placeholder="VD: Công ty TNHH ABC" />
                    </Form.Item>
                    <Form.Item name="phone" label="Số điện thoại">
                        <Input placeholder="VD: 0987654321" />
                    </Form.Item>
                    <Form.Item name="deliveryAddress" label="Địa chỉ giao hàng">
                        <Input placeholder="VD: Số 1 đường X, TP Y" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
