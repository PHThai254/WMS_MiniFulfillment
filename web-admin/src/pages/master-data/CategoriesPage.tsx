import React, { useEffect, useState, useCallback } from 'react';
import { Form, Input, message, Space, Button, Modal, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseTable } from '../../components/common/BaseTable';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import type { ICategory } from '../../types/domain';
import { categoryService } from '../../services/categoryService';

export const CategoriesPage: React.FC = () => {
    const [categories, setCategories] = useState<ICategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ICategory | null>(null);
    const [search, setSearch] = useState('');
    const [form] = Form.useForm();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Ép buộc tải lại dữ liệu mới nhất từ Server (bỏ qua cache) để thấy số lượng sản phẩm realtime
            const res = await categoryService.list(true);
            if (res?.success) setCategories(res.data || []);
        } catch { message.error('Không thể tải danh mục.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
    const openEdit = (c: ICategory) => { setEditing(c); form.setFieldsValue({ name: c.name }); setModalOpen(true); };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            if (editing) {
                await categoryService.update(editing.id, values);
                message.success('Cập nhật danh mục thành công!');
            } else {
                await categoryService.create(values);
                message.success('Tạo danh mục thành công!');
            }
            setModalOpen(false);
            fetchData();
        } catch { message.error('Thao tác thất bại.'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        await categoryService.delete(id);
        message.success('Xóa danh mục thành công!');
        fetchData();
    };

    const filtered = categories.filter(c =>
        !search || c.name.toLowerCase().includes(search.toLowerCase())
    );

    const columns = [
        { title: 'Tên danh mục', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
        { title: 'Số sản phẩm', dataIndex: 'productCount', key: 'productCount' },
        {
            title: 'Hành động', key: 'action',
            render: (_: unknown, record: ICategory) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>Sửa</Button>
                    <Popconfirm title="Xác nhận xóa danh mục này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
                        <Button icon={<DeleteOutlined />} size="small" danger>Xóa</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <PageHeader title="Quản lý Danh mục" subtitle="Phân loại hàng hóa trong kho" />
            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                <Input.Search placeholder="Tìm tên danh mục..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 300 }} allowClear />
                <PrimaryButton icon={<PlusOutlined />} onClick={openCreate}>Thêm Danh mục</PrimaryButton>
            </Space>
            <BaseTable columns={columns} dataSource={filtered} rowKey="id" loading={loading} />
            <Modal title={editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'} open={modalOpen} onCancel={() => setModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setModalOpen(false)}>Hủy</Button>,
                    <Button key="save" type="primary" loading={saving} onClick={handleSave}>Lưu</Button>
                ]}>
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Tên danh mục" rules={[{ required: true, message: 'Nhập tên danh mục' }]}>
                        <Input placeholder="VD: Điện tử" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
