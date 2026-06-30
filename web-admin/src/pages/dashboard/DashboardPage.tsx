import { formatVND } from '../../helpers/formatters';
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Space, Alert, Spin } from 'antd';
import {
    InboxOutlined, ExportOutlined, ProductOutlined,
    ShopOutlined, WarningOutlined,
} from '@ant-design/icons';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseTable } from '../../components/common/BaseTable';
import { analyticsService } from '../../services/operationServices';
import type { IDashboardKpi, ILowStockProduct, IStockMovement } from '../../types/domain';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [kpi, setKpi] = useState<IDashboardKpi | null>(null);
    const [lowStock, setLowStock] = useState<ILowStockProduct[]>([]);
    const [movements, setMovements] = useState<IStockMovement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [kpiRes, lowStockRes, movementsRes] = await Promise.all([
                    analyticsService.kpis(),
                    analyticsService.lowStock(5),
                    analyticsService.stockMovements(7),
                ]);
                if (kpiRes?.success) setKpi(kpiRes.data!);
                if (lowStockRes?.success) setLowStock(lowStockRes.data || []);
                if (movementsRes?.success) setMovements(movementsRes.data || []);
            } catch {
                message.error('Không thể tải dữ liệu Dashboard.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const lowStockColumns = [
        { title: 'Sản phẩm', dataIndex: 'productName', key: 'productName' },
        { title: 'Barcode', dataIndex: 'productBarcode', key: 'productBarcode' },
        {
            title: 'Tồn kho',
            dataIndex: 'totalQuantity',
            key: 'totalQuantity',
            render: (qty: number) => (
                <span style={{ color: qty < 5 ? '#ff4d4f' : '#faad14', fontWeight: 'bold' }}>
                    {qty}
                </span>
            ),
        },
    ];

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

    return (
        <Space direction="vertical" size="large" style={{ width: '100%', padding: 24 }}>
            <PageHeader title="Tổng quan" subtitle="Tổng quan hệ thống Quản lý Kho WMS" />

            {kpi?.lowStockAlerts ? (
                <Alert
                    message={`Cảnh báo: ${kpi.lowStockAlerts} sản phẩm sắp hết hàng!`}
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                />
            ) : null}

            {/* KPI Cards - AntD Statistic */}
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card 
                        hoverable 
                        onClick={() => navigate('/receipts')}
                        style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                        bodyStyle={{ padding: 24 }}
                    >
                        <Statistic
                            title={<span style={{ color: '#1677ff', fontWeight: 500 }}>Phiếu Nhập đang chờ →</span>}
                            value={kpi?.pendingReceipts ?? 0}
                            prefix={<InboxOutlined />}
                            valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card 
                        hoverable 
                        onClick={() => navigate('/issues')}
                        style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                        bodyStyle={{ padding: 24 }}
                    >
                        <Statistic
                            title={<span style={{ color: '#52c41a', fontWeight: 500 }}>Lệnh Xuất đang xử lý →</span>}
                            value={kpi?.activeIssues ?? 0}
                            prefix={<ExportOutlined />}
                            valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Tổng sản phẩm"
                            value={kpi?.totalProducts ?? 0}
                            prefix={<ProductOutlined />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Cảnh báo tồn thấp"
                            value={kpi?.lowStockAlerts ?? 0}
                            prefix={<WarningOutlined />}
                            valueStyle={{ color: kpi?.lowStockAlerts ? '#ff4d4f' : '#52c41a' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                {/* Biểu đồ xuất nhập kho - Recharts */}
                <Col xs={24} lg={16}>
                    <Card title="Biến động tồn kho 7 ngày qua">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={movements}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="inbound" name="Nhập kho" fill="#1677ff" />
                                <Bar dataKey="outbound" name="Xuất kho" fill="#52c41a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                {/* Top 5 sản phẩm sắp hết - theo copilot-instructions */}
                <Col xs={24} lg={8}>
                    <Card title="Top 5 sản phẩm sắp hết hàng" style={{ height: '100%' }}>
                        <BaseTable
                            columns={lowStockColumns}
                            dataSource={lowStock}
                            rowKey="productId"
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
            </Row>
        </Space>
    );
};
