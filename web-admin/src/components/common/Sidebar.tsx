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

    // ✅ PHÂN QUYỀN MENU THEO 3 ROLES MỚI:
    // - Admin: Toàn bộ menu (master-data, operations đầy đủ, inventory, analytics, users)
    // - QA_QC: Operations (chỉ Receipts + AI OCR), Inventory, Analytics
    // - Staff: Chỉ Dashboard (Staff dùng Mobile App, không phải Web Admin)
    const isAdmin = user?.role === 'Admin';
    const isQaQc = user?.role === 'QA_QC';

    const menuItems: any[] = [
        {
            key: 'dashboard',
            icon: <DashboardOutlined />,
            label: 'Tổng quan',
            onClick: () => navigate('/dashboard'),
        },
    ];

    // ─── Master Data: CHỈ Admin ───────────────────────────────────────────────
    if (isAdmin) {
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

    // ─── Operations: Admin (đầy đủ) | QA_QC (chỉ Receipts để duyệt) ──────────
    if (isAdmin || isQaQc) {
        const operationChildren: any[] = [
            {
                key: 'receipts',
                label: 'Phiếu Nhập (Inbound)',
                onClick: () => navigate('/receipts'),
            },
        ];

        // Phiếu Xuất chỉ Admin mới được tạo, QA_QC không liên quan
        if (isAdmin) {
            operationChildren.push({
                key: 'issues',
                label: 'Phiếu Xuất (Outbound)',
                onClick: () => navigate('/issues'),
            });
        }

        menuItems.push({
            key: 'operations',
            icon: <FileTextOutlined />,
            label: 'Vận hành',
            children: operationChildren,
        });
    }

    // ─── Inventory: Admin + QA_QC ─────────────────────────────────────────────
    if (isAdmin || isQaQc) {
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
    }

    // ─── Analytics: Admin + QA_QC ─────────────────────────────────────────────
    if (isAdmin || isQaQc) {
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
    }

    // ─── User Management: CHỈ Admin ───────────────────────────────────────────
    if (isAdmin) {
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
            width={250}
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