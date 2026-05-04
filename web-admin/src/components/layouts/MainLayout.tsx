import React from 'react';
import { Layout } from 'antd';
import { Navbar } from '../common/Navbar';
import { Sidebar } from '../common/Sidebar';
import { Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../stores/hooks';
import { toggleSidebar } from '../../stores/appSlice';

/**
 * MainLayout - Main application layout with Navbar + Sidebar + Content
 */
export const MainLayout: React.FC = () => {
    const collapsed = useAppSelector((state) => state.app.sidebarCollapsed);
    const dispatch = useAppDispatch();

    return (
        <Layout>
            <Navbar collapsed={collapsed} onToggle={() => dispatch(toggleSidebar())} />
            <Layout>
                <Sidebar collapsed={collapsed} />
                <Layout.Content>
                    <Outlet />
                </Layout.Content>
            </Layout>
        </Layout>
    );
};
