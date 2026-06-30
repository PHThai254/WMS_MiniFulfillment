import { formatVND } from '../../helpers/formatters';
import React, { useEffect, useState, useCallback } from 'react';
// BỔ SUNG IMPORT InputNumber
import { Form, Input, Select, message, Space, Modal, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PrinterOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseTable } from '../../components/common/BaseTable';
import { PrimaryButton, DefaultButton  } from '../../components/common';
import type { IProduct, ICategory } from '../../types/domain';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import { barcodePdfService } from '../../services/barcodePdfService';

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
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [form] = Form.useForm();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [pRes, cRes] = await Promise.all([productService.list(search, filterCategory), categoryService.list(true)]);
            if (pRes?.success) setProducts(pRes.data || []);
            if (cRes?.success) setCategories(cRes.data || []);
        } catch { message.error('Không thể tải sản phẩm.'); }
        finally { setLoading(false); }
    }, [search, filterCategory]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
    
    // BỔ SUNG MAP TRƯỜNG price KHI BẤM SỬA
    const openEdit = (p: IProduct) => { 
        setEditing(p); 
        form.setFieldsValue({ name: p.name, sku: p.sku, categoryId: p.categoryId, price: p.price }); 
        setModalOpen(true); 
    };

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
        } catch (error: any) {
            message.error(error?.response?.data?.message || error?.message || 'Thao tác thất bại.');
        }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        await productService.delete(id);
        message.success('Xóa sản phẩm thành công!');
        fetchData();
    };

    const handlePrintBarcode = (record: IProduct) => {
        if (!record.barcode) {
            message.warning('Sản phẩm này chưa có Mã Barcode!');
            return;
        }
        try {
            barcodePdfService.generateSingleBarcodePdf(
                record.barcode,
                `barcode_${record.barcode}.pdf`,
                record.name
            );
            message.success('Đã tải xuống file PDF mã vạch!');
        } catch (error) {
            message.error((error as Error).message);
        }
    };

    const handlePrintMultipleBarcodes = () => {
        if (selectedRowKeys.length === 0) {
            message.warning('Vui lòng chọn ít nhất 1 sản phẩm!');
            return;
        }

        const selectedProducts = products.filter(p => selectedRowKeys.includes(p.id));
        const itemsToPrint = selectedProducts
            .filter(p => !!p.barcode)
            .map(p => ({ barcode: p.barcode, name: p.name }));

        if (itemsToPrint.length === 0) {
            message.warning('Các sản phẩm được chọn chưa có Mã Barcode!');
            return;
        }

        try {
            barcodePdfService.generateMultipleBarcodesPdf(itemsToPrint, 'bulk_barcodes.pdf');
            message.success(`Đã tải xuống file PDF chứa ${itemsToPrint.length} mã vạch!`);
            setSelectedRowKeys([]); // clear selection after print
        } catch (error) {
            message.error((error as Error).message);
        }
    };

    const columns = [
        { title: 'Tên sản phẩm', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
        { title: 'SKU', dataIndex: 'sku', key: 'sku' },
        { title: 'Barcode', dataIndex: 'barcode', key: 'barcode' },
        // BỔ SUNG CỘT ĐƠN GIÁ
        {
            title: 'Đơn giá',
            dataIndex: 'price',
            key: 'price',
            align: 'right' as const,
            render: (value: number) => (
                <span style={{ fontWeight: 'bold', color: '#1677ff' }}>
                    {formatVND(value)}
                </span>
            ),
        },
        { title: 'Danh mục', dataIndex: 'categoryName', key: 'categoryName' },
        {
            title: 'Hành động', key: 'action',
            render: (_: unknown, record: IProduct) => (
                <Space>
                    <PrimaryButton icon={<PrinterOutlined />} size="small" onClick={() => handlePrintBarcode(record)}>In Barcode</PrimaryButton>
                    <PrimaryButton icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>Sửa</PrimaryButton>
                    <Popconfirm title="Xác nhận xóa sản phẩm này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
                        <PrimaryButton icon={<DeleteOutlined />} size="small" danger>Xóa</PrimaryButton>
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
                <Space>
                    {selectedRowKeys.length > 0 && (
                        <PrimaryButton icon={<PrinterOutlined />} onClick={handlePrintMultipleBarcodes}>
                            In mã vạch đã chọn ({selectedRowKeys.length})
                        </PrimaryButton>
                    )}
                    <PrimaryButton icon={<PlusOutlined />} onClick={openCreate}>Thêm Sản phẩm</PrimaryButton>
                </Space>
            </Space>
            <BaseTable
                columns={columns}
                dataSource={products}
                rowKey="id"
                loading={loading}
                rowSelection={{
                    selectedRowKeys,
                    onChange: (newSelectedRowKeys) => {
                        setSelectedRowKeys(newSelectedRowKeys);
                    },
                }}
            />
            <Modal title={editing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'} open={modalOpen} onCancel={() => setModalOpen(false)}
                footer={[
                    <DefaultButton key="cancel" onClick={() => setModalOpen(false)}>Hủy</DefaultButton>,
                    <PrimaryButton key="save" type="primary" loading={saving} onClick={handleSave}>Lưu</PrimaryButton>
                ]}>
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true, message: 'Nhập tên' }]}>
                        <Input placeholder="VD: Iphone 15 Pro Max" />
                    </Form.Item>
                    
                    <Form.Item name="sku" label="SKU (Mã nội bộ)">
                        <Input placeholder="VD: IPH-15-PM (để trống tự tạo)" />
                    </Form.Item>

                    {/* BỔ SUNG Ô NHẬP ĐƠN GIÁ */}
                    <Form.Item
                        name="price"
                        label="Đơn giá (VNĐ)"
                        rules={[
                            { required: true, message: 'Vui lòng nhập đơn giá!' },
                            { type: 'number', min: 0, message: 'Đơn giá không được là số âm!' }
                        ]}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            placeholder="Nhập giá bán..."
                            addonAfter="₫"
                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
                        />
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