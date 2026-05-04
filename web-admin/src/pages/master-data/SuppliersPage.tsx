import React, { useEffect, useState, useCallback } from 'react';
import { Form, Input, Select, message, Space, Button, Modal, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseTable } from '../../components/common/BaseTable';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import type { ISupplier } from '../../types/domain';
import { supplierService } from '../../services/supplierService';

export const SuppliersPage: React.FC = () => {
    const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ISupplier | null>(null);
    const [search, setSearch] = useState('');
    const [form] = Form.useForm();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await supplierService.list();
            if (res?.success) setSuppliers(res.data || []);
        } catch { message.error('Không thể tải nhà cung cấp.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
    const openEdit = (s: ISupplier) => { setEditing(s); form.setFieldsValue({ name: s.name, contactPerson: s.contactPerson, phone: s.phone, address: s.address }); setModalOpen(true); };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            if (editing) {
                await supplierService.update(editing.id, values);
                message.success('Cập nhật nhà cung cấp thành công!');
            } else {
                await supplierService.create(values);
                message.success('Tạo nhà cung cấp thành công!');
            }
            setModalOpen(false);
            fetchData();
        } catch { message.error('Thao tác thất bại.'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        await supplierService.delete(id);
        message.success('Xóa nhà cung cấp thành công!');
        fetchData();
    };

    const filtered = suppliers.filter(s =>
        !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.phone && s.phone.includes(search))
    );

    const columns = [
        { title: 'Tên nhà cung cấp', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
        { title: 'Người liên hệ', dataIndex: 'contactPerson', key: 'contactPerson' },
        { title: 'Điện thoại', dataIndex: 'phone', key: 'phone' },
        { title: 'Địa chỉ', dataIndex: 'address', key: 'address' },
        {
            title: 'Hành động', key: 'action',
            render: (_: unknown, record: ISupplier) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>Sửa</Button>
                    <Popconfirm title="Xác nhận xóa nhà cung cấp này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
                        <Button icon={<DeleteOutlined />} size="small" danger>Xóa</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <PageHeader title="Quản lý Nhà cung cấp" subtitle="Danh sách đối tác nhập hàng" />
            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                <Input.Search placeholder="Tìm tên, SĐT..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 300 }} allowClear />
                <PrimaryButton icon={<PlusOutlined />} onClick={openCreate}>Thêm Nhà cung cấp</PrimaryButton>
            </Space>
            <BaseTable columns={columns} dataSource={filtered} rowKey="id" loading={loading} />
            <Modal title={editing ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'} open={modalOpen} onCancel={() => setModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setModalOpen(false)}>Hủy</Button>,
                    <Button key="save" type="primary" loading={saving} onClick={handleSave}>Lưu</Button>
                ]}>
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Tên nhà cung cấp" rules={[{ required: true, message: 'Nhập tên' }]}>
                        <Input placeholder="VD: Công ty TNHH ABC" />
                    </Form.Item>
                    <Form.Item name="contactPerson" label="Người liên hệ">
                        <Input placeholder="VD: Nguyễn Văn A" />
                    </Form.Item>
                    <Form.Item name="phone" label="Số điện thoại">
                        <Input placeholder="VD: 0987654321" />
                    </Form.Item>
                    <Form.Item name="address" label="Địa chỉ">
                        <Input placeholder="VD: Số 1 đường X, TP Y" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
