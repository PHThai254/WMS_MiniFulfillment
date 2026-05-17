import React from 'react';
import { Layout, Menu } from 'antd';
import {
    DashboardOutlined,
    DatabaseOutlined,
    FileTextOutlined,
    BarChartOutlined,
    UserOutlined,
    ShopOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
    collapsed?: boolean;
}

/**
 * Sidebar - Navigation menu component
 * Shows different menu items based on user role
 */
export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const menuItems: any[] = [
        {
            key: 'dashboard',
            icon: <DashboardOutlined />,
            label: 'Tổng quan',
            onClick: () => navigate('/dashboard'),
        },
    ];

    // Master Data - All roles can see
    if (user?.role === 'Admin') {
        menuItems.push({
            key: 'master-data',
            icon: <DatabaseOutlined />,
            label: 'Dữ liệu nền',
            children: [
                {
                    key: 'warehouses',
                    label: 'Kho bãi',
                    onClick: () => navigate('/warehouses'),
                },
                {
                    key: 'zones',
                    label: 'Khu vực kho',
                    onClick: () => navigate('/zones'),
                },
                {
                    key: 'products',
                    label: 'Sản phẩm',
                    onClick: () => navigate('/products'),
                },
                {
                    key: 'categories',
                    label: 'Danh mục',
                    onClick: () => navigate('/categories'),
                },
                {
                    key: 'suppliers',
                    label: 'Nhà cung cấp',
                    onClick: () => navigate('/suppliers'),
                },
                {
                    key: 'customers',
                    label: 'Khách hàng',
                    onClick: () => navigate('/customers'),
                },
            ],
        });
    }

    // Operations
    menuItems.push({
        key: 'operations',
        icon: <FileTextOutlined />,
        label: 'Vận hành',
        children: [
            {
                key: 'receipts',
                label: 'Phiếu Nhập (Inbound)',
                onClick: () => navigate('/receipts'),
            },
            {
                key: 'issues',
                label: 'Phiếu Xuất (Outbound)',
                onClick: () => navigate('/issues'),
            },
        ],
    });

    // Inventory
    menuItems.push({
        key: 'inventory',
        icon: <ShopOutlined />,
        label: 'Tồn kho',
        children: [
            {
                key: 'stock-summary',
                label: 'Tổng hợp Tồn kho',
                onClick: () => navigate('/inventory/stock-summary'),
            },
            {
                key: 'transactions',
                label: 'Lịch sử Giao dịch',
                onClick: () => navigate('/inventory/transactions'),
            },
        ],
    });

    // Analytics
    menuItems.push({
        key: 'analytics',
        icon: <BarChartOutlined />,
        label: 'Phân tích & Báo cáo',
        children: [
            {
                key: 'reports',
                label: 'Báo cáo',
                onClick: () => navigate('/analytics/reports'),
            },
            {
                key: 'kpis',
                label: 'Chỉ số KPIs',
                onClick: () => navigate('/analytics/kpis'),
            },
        ],
    });

    // User Management - Admin only
    if (user?.role === 'Admin') {
        menuItems.push({
            key: 'users',
            icon: <UserOutlined />,
            label: 'Quản lý Nhân sự',
            onClick: () => navigate('/users'),
        });
    }

    return (
        <Layout.Sider
            collapsed={collapsed}
            width={200}
            theme="light"
        >
            <Menu
                mode="inline"
                defaultSelectedKeys={['dashboard']}
                items={menuItems}
            />
        </Layout.Sider>
    );
};
