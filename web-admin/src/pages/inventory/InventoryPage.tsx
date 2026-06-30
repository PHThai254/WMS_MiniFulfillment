import { formatVND } from '../../helpers/formatters';
import React, { useEffect, useState, useCallback } from 'react';
import { Tabs, Tag, Space, Input, Select, message, Spin } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseTable } from '../../components/common/BaseTable';
import { inventoryService } from '../../services/operationServices';
import { warehouseService } from '../../services/warehouseService';
import { zoneService } from '../../services/zoneService';
import type { IInventory, IStockSummary, IInventoryTransaction, IWarehouse, IZone } from '../../types/domain';

const { Option } = Select;

export const InventoryPage: React.FC = () => {
    const [inventory, setInventory] = useState<IInventory[]>([]);
    const [invTotal, setInvTotal] = useState(0);
    const [invPage, setInvPage] = useState(1);

    const [stockSummary, setStockSummary] = useState<IStockSummary[]>([]);
    
    const [transactions, setTransactions] = useState<IInventoryTransaction[]>([]);
    const [txTotal, setTxTotal] = useState(0);
    const [txPage, setTxPage] = useState(1);

    const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
    const [zones, setZones] = useState<IZone[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [filterWarehouse, setFilterWarehouse] = useState<string | undefined>();
    const [filterZone, setFilterZone] = useState<string | undefined>();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [invRes, sumRes, txRes, wRes, zRes] = await Promise.all([
                inventoryService.list({ pageIndex: invPage, pageSize: 20, warehouseId: filterWarehouse, zoneId: filterZone }),
                inventoryService.stockSummary(),
                inventoryService.transactions(txPage, 50),
                warehouseService.list(true),
                zoneService.list(undefined, true),
            ]);
            if (invRes?.success) {
                setInventory(invRes.data?.items || []);
                setInvTotal(invRes.data?.totalCount || 0);
            }
            if (sumRes?.success) setStockSummary(sumRes.data || []);
            if (txRes?.success) {
                setTransactions(txRes.data?.items || []);
                setTxTotal(txRes.data?.totalCount || 0);
            }
            if (wRes?.success) setWarehouses(wRes.data || []);
            if (zRes?.success) setZones(zRes.data || []);
        } catch { message.error('Không thể tải dữ liệu tồn kho.'); }
        finally { setLoading(false); }
    }, [filterWarehouse, filterZone, invPage, txPage]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filteredInventory = inventory.filter(i =>
        !debouncedSearch || i.productName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        i.productBarcode.includes(debouncedSearch) || i.productSKU.includes(debouncedSearch)
    );

    const filteredSummary = stockSummary.filter(s =>
        !debouncedSearch || s.productName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.productBarcode.includes(debouncedSearch)
    );

    const inventoryColumns = [
        { title: 'Sản phẩm', dataIndex: 'productName', key: 'productName' },
        { title: 'Kho', dataIndex: 'warehouseName', key: 'warehouseName' },
        { title: 'Zone', dataIndex: 'zoneName', key: 'zoneName' },
        {
            title: 'Số lượng', dataIndex: 'quantity', key: 'quantity',
            render: (q: number) => (
                <Tag color={q < 10 ? 'red' : q < 50 ? 'orange' : 'green'}>
                    {q}
                </Tag>
            )
        },
        // BỔ SUNG CỘT ĐƠN GIÁ VÀ GIÁ TRỊ TỒN KHO
        { 
            title: 'Đơn giá', 
            dataIndex: 'productPrice', 
            key: 'productPrice',
            align: 'right' as const,
            render: (v: number) => <span style={{ color: '#888' }}>{formatVND(v || 0)}</span> 
        },
        { 
            title: 'Giá trị tồn', 
            key: 'totalValue',
            align: 'right' as const,
            render: (_: unknown, record: IInventory) => (
                <strong style={{ color: '#1677ff' }}>
                    {formatVND(record.quantity * (record.productPrice || 0))}
                </strong>
            )
        },
        {
            title: 'Lần nhập cuối', dataIndex: 'lastRestockedDate', key: 'lastRestockedDate',
            render: (v: string) => new Date(v).toLocaleDateString('vi-VN')
        },
    ];

    const summaryColumns = [
        { title: 'Sản phẩm', dataIndex: 'productName', key: 'productName' },
        { title: 'SKU', dataIndex: 'productSKU', key: 'productSKU' },
        {
            title: 'Tổng tồn kho', dataIndex: 'totalQuantity', key: 'totalQuantity',
            render: (q: number) => (
                <Tag color={q < 10 ? 'red' : q < 50 ? 'orange' : 'green'}>
                    <strong>{q}</strong>
                </Tag>
            )
        },
        // BỔ SUNG CỘT ĐƠN GIÁ VÀ TỔNG GIÁ TRỊ
        { 
            title: 'Đơn giá', 
            dataIndex: 'productPrice', 
            key: 'productPrice',
            align: 'right' as const,
            render: (v: number) => <span style={{ color: '#888' }}>{formatVND(v || 0)}</span> 
        },
        { 
            title: 'Tổng giá trị', 
            key: 'totalValue',
            align: 'right' as const,
            render: (_: unknown, record: IStockSummary) => (
                <strong style={{ color: '#1677ff' }}>
                    {formatVND(record.totalQuantity * (record.productPrice || 0))}
                </strong>
            )
        },
        {
            title: 'Phân bổ Zone', key: 'stockByZone',
            render: (_: unknown, record: IStockSummary) => (
                <Space wrap>
                    {record.stockByZone.map(z => (
                        <Tag key={z.zoneId}>{z.zoneName}: {z.quantity}</Tag>
                    ))}
                </Space>
            )
        }
    ];

    const txColumns = [
        { title: 'Sản phẩm', dataIndex: 'productName', key: 'productName' },
        { title: 'Zone', dataIndex: 'zoneName', key: 'zoneName' },
        {
            title: 'Biến động', dataIndex: 'quantityChange', key: 'quantityChange',
            render: (q: number) => <Tag color={q > 0 ? 'green' : 'red'}>{q > 0 ? '+' : ''}{q}</Tag>
        },
        {
            title: 'Loại', dataIndex: 'transactionType', key: 'transactionType',
            render: (t: string) => <Tag color={t === 'INBOUND' ? 'blue' : t === 'OUTBOUND' ? 'orange' : 'purple'}>{t}</Tag>
        },
        { title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => new Date(v).toLocaleString('vi-VN') },
    ];

    const filterBar = (
        <Space style={{ marginBottom: 16 }}>
            <Input.Search placeholder="Tìm sản phẩm, barcode..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 250 }} allowClear />
            <Select placeholder="Lọc theo Kho" style={{ width: 180 }} allowClear onChange={setFilterWarehouse}>
                {warehouses.map(w => <Option key={w.id} value={w.id}>{w.name}</Option>)}
            </Select>
            <Select placeholder="Lọc theo Zone" style={{ width: 180 }} allowClear onChange={setFilterZone}>
                {zones.filter(z => !filterWarehouse || z.warehouseId === filterWarehouse).map(z => <Option key={z.id} value={z.id}>{z.name}</Option>)}
            </Select>
        </Space>
    );

    return (
        <div style={{ padding: 24 }}>
            <PageHeader title="Quản lý Tồn kho" subtitle="Theo dõi tồn kho real-time theo Zone và Kho" />
            <Tabs defaultActiveKey="summary" items={[
                {
                    key: 'summary',
                    label: 'Tổng hợp tồn kho',
                    children: (
                        <>{filterBar}<BaseTable loading={loading} columns={summaryColumns} dataSource={filteredSummary} rowKey="productId" /></>
                    )
                },
                {
                    key: 'detail',
                    label: 'Chi tiết theo Zone',
                    children: (
                        <>{filterBar}<BaseTable loading={loading} columns={inventoryColumns} dataSource={filteredInventory} rowKey="id" 
                        pagination={{ current: invPage, pageSize: 20, total: invTotal, onChange: setInvPage }} /></>
                    )
                },
                {
                    key: 'transactions',
                    label: <><SwapOutlined /> Lịch sử giao dịch</>,
                    children: (
                        <BaseTable loading={loading} columns={txColumns} dataSource={transactions} rowKey="id" 
                        pagination={{ current: txPage, pageSize: 50, total: txTotal, onChange: setTxPage }} />
                    )
                },
            ]} />
        </div>
    );
};