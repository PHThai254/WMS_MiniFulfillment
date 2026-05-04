import { Layout, Dropdown, Row, Col, Space, Typography, Button, Avatar } from 'antd';
import { UserOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, DownOutlined, IdcardOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

/**
 * Navbar - Header component with user menu
 */
export const Navbar: React.FC<NavbarProps> = ({ collapsed = false, onToggle }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const userMenuItems = [
        {
            key: 'info',
            label: (
                <div style={{ padding: '4px 0' }}>
                    <Typography.Text strong>{user?.username || 'User'}</Typography.Text>
                    <br />
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                        {user?.role || 'Administrator'}
                    </Typography.Text>
                </div>
            ),
            disabled: true,
        },
        {
            type: 'divider',
        },
        {
            key: 'profile',
            icon: <IdcardOutlined />,
            label: 'Hồ sơ cá nhân (Profile)',
            onClick: () => navigate('/profile'),
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Đăng xuất (Logout)',
            onClick: handleLogout,
            danger: true,
        },
    ];

    return (
        <Layout.Header style={{ padding: '0 24px', backgroundColor: '#001529' }}>
            <Row justify="space-between" align="middle" style={{ height: '100%' }}>
                <Col>
                    <Space size="middle" align="center">
                        {onToggle && (
                            <Button
                                type="text"
                                icon={collapsed ? <MenuUnfoldOutlined style={{ color: '#fff', fontSize: '18px' }} /> : <MenuFoldOutlined style={{ color: '#fff', fontSize: '18px' }} />}
                                onClick={onToggle}
                                style={{ color: '#fff' }}
                            />
                        )}
                        <Typography.Title level={4} style={{ color: '#fff', margin: 0, letterSpacing: '1px' }}>
                            WMS Admin
                        </Typography.Title>
                    </Space>
                </Col>
                <Col>
                    <Dropdown menu={{ items: userMenuItems as any }} trigger={['click']} placement="bottomRight">
                        <Space style={{ cursor: 'pointer', padding: '0 8px', color: '#fff', borderRadius: '4px', transition: 'background 0.3s' }} className="user-dropdown-trigger">
                            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                            <span style={{ fontWeight: 500 }}>{user?.username || 'Admin'}</span>
                            <DownOutlined style={{ fontSize: '12px', opacity: 0.8 }} />
                        </Space>
                    </Dropdown>
                </Col>
            </Row>
        </Layout.Header>
    );
};
