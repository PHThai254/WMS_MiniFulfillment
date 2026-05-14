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
            label: 'Dashboard',
            onClick: () => navigate('/dashboard'),
        },
    ];

    // Master Data - All roles can see 
    menuItems.push({
        key: 'master-data',
        icon: <DatabaseOutlined />,
        label: 'Master Data',
        children: [
            {
                key: 'warehouses',
                label: 'Warehouses',
                onClick: () => navigate('/warehouses'),
            },
            {
                key: 'zones',
                label: 'Zones',
                onClick: () => navigate('/zones'),
            },
            {
                key: 'products',
                label: 'Products',
                onClick: () => navigate('/products'),
            },
            {
                key: 'categories',
                label: 'Categories',
                onClick: () => navigate('/categories'),
            },
            {
                key: 'suppliers',
                label: 'Suppliers',
                onClick: () => navigate('/suppliers'),
            },
            {
                key: 'customers',
                label: 'Customers',
                onClick: () => navigate('/customers'),
            },
        ],
    });

    // Operations
    menuItems.push({
        key: 'operations',
        icon: <FileTextOutlined />,
        label: 'Operations',
        children: [
            {
                key: 'receipts',
                label: 'Receipts (Inbound)',
                onClick: () => navigate('/receipts'),
            },
            {
                key: 'issues',
                label: 'Issues (Outbound)',
                onClick: () => navigate('/issues'),
            },
        ],
    });

    // Inventory
    menuItems.push({
        key: 'inventory',
        icon: <ShopOutlined />,
        label: 'Inventory',
        children: [
            {
                key: 'stock-summary',
                label: 'Stock Summary',
                onClick: () => navigate('/inventory/stock-summary'),
            },
            {
                key: 'transactions',
                label: 'Transactions',
                onClick: () => navigate('/inventory/transactions'),
            },
        ],
    });

    // Analytics
    menuItems.push({
        key: 'analytics',
        icon: <BarChartOutlined />,
        label: 'Analytics',
        children: [
            {
                key: 'reports',
                label: 'Reports',
                onClick: () => navigate('/analytics/reports'),
            },
            {
                key: 'kpis',
                label: 'KPIs',
                onClick: () => navigate('/analytics/kpis'),
            },
        ],
    });

    // User Management - Admin only (VẪN GIỮ LẠI LỆNH IF ĐỂ BẢO MẬT)
    if (user?.role === 'Admin') {
        menuItems.push({
            key: 'users',
            icon: <UserOutlined />,
            label: 'User Management',
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