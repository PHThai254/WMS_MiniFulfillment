import React, { useEffect, useState, useCallback } from 'react';
import { Form, Input, Select, message, Space, Button, Modal, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseTable } from '../../components/common/BaseTable';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import type { IProduct, ICategory } from '../../types/domain';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';

const { Option } = Select;

export const ProductsPage: React.FC = () => {
    const [products, setProducts] = useState<IProduct[]>([]);
    const [categories, setCategories] = useState<ICategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<IProduct | null>(null);
    const [filterCategory, setFilterCategory] = useState<string | undefined>();
    const [search, setSearch] = useState('');
    const [form] = Form.useForm();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [pRes, cRes] = await Promise.all([productService.list(search, filterCategory), categoryService.list()]);
            if (pRes?.success) setProducts(pRes.data || []);
            if (cRes?.success) setCategories(cRes.data || []);
        } catch { message.error('Không thể tải sản phẩm.'); }
        finally { setLoading(false); }
    }, [search, filterCategory]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
    const openEdit = (p: IProduct) => { setEditing(p); form.setFieldsValue({ name: p.name, sku: p.sku, categoryId: p.categoryId }); setModalOpen(true); };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            if (editing) {
                await productService.update(editing.id, values);
                message.success('Cập nhật sản phẩm thành công!');
            } else {
                await productService.create(values);
                message.success('Tạo sản phẩm thành công!');
            }
            setModalOpen(false);
            fetchData();
        } catch { message.error('Thao tác thất bại.'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        await productService.delete(id);
        message.success('Xóa sản phẩm thành công!');
        fetchData();
    };

    const columns = [
        { title: 'Tên sản phẩm', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
        { title: 'SKU', dataIndex: 'sku', key: 'sku' },
        { title: 'Barcode', dataIndex: 'barcode', key: 'barcode' },
        { title: 'Danh mục', dataIndex: 'categoryName', key: 'categoryName' },
        {
            title: 'Hành động', key: 'action',
            render: (_: unknown, record: IProduct) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>Sửa</Button>
                    <Popconfirm title="Xác nhận xóa sản phẩm này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
                        <Button icon={<DeleteOutlined />} size="small" danger>Xóa</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <PageHeader title="Quản lý Sản phẩm" subtitle="Danh mục hàng hóa và Barcode" />
            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                <Space>
                    <Input.Search placeholder="Tìm kiếm tên, sku..." value={search} onChange={e => setSearch(e.target.value)} onSearch={fetchData} style={{ width: 250 }} allowClear />
                    <Select placeholder="Lọc theo danh mục" style={{ width: 180 }} allowClear onChange={setFilterCategory}>
                        {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                    </Select>
                </Space>
                <PrimaryButton icon={<PlusOutlined />} onClick={openCreate}>Thêm Sản phẩm</PrimaryButton>
            </Space>
            <BaseTable columns={columns} dataSource={products} rowKey="id" loading={loading} />
            <Modal title={editing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'} open={modalOpen} onCancel={() => setModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setModalOpen(false)}>Hủy</Button>,
                    <Button key="save" type="primary" loading={saving} onClick={handleSave}>Lưu</Button>
                ]}>
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true, message: 'Nhập tên' }]}>
                        <Input placeholder="VD: Iphone 15 Pro Max" />
                    </Form.Item>
                    <Form.Item name="sku" label="SKU (Mã nội bộ)">
                        <Input placeholder="VD: IPH-15-PM (để trống tự tạo)" />
                    </Form.Item>
                    <Form.Item name="categoryId" label="Danh mục" rules={[{ required: true, message: 'Chọn danh mục' }]}>
                        <Select placeholder="Chọn danh mục">
                            {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
