import React from 'react';
import { Card, Descriptions, Avatar, Typography, Divider, Badge } from 'antd';
import { UserOutlined, MailOutlined, SafetyCertificateOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/common/PageHeader';

export const ProfilePage: React.FC = () => {
    const { user } = useAuth();

    return (
        <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
            <PageHeader title="Hồ sơ cá nhân" subtitle="Thông tin tài khoản của bạn" />
            <Card style={{ marginTop: 24, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Avatar size={100} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff', fontSize: 48 }} />
                    <Typography.Title level={3} style={{ marginTop: 16, marginBottom: 0 }}>
                        {user?.username || 'Admin'}
                    </Typography.Title>
                    <Typography.Text type="secondary">
                        {user?.role || 'Administrator'}
                    </Typography.Text>
                </div>
                
                <Divider />

                <Descriptions title="Thông tin chi tiết" column={1} labelStyle={{ fontWeight: 'bold', width: '150px' }}>
                    <Descriptions.Item label={<><UserOutlined /> Tên tài khoản</>}>
                        {user?.username}
                    </Descriptions.Item>
                    <Descriptions.Item label={<><SafetyCertificateOutlined /> Vai trò</>}>
                        <Badge status="success" text={user?.role || 'System Admin'} />
                    </Descriptions.Item>
                    <Descriptions.Item label={<><EnvironmentOutlined /> Kho phụ trách</>}>
                        {user?.warehouseName || 'Tất cả các kho (Toàn quyền)'}
                    </Descriptions.Item>
                    <Descriptions.Item label={<><MailOutlined /> Trạng thái</>}>
                        <Badge status="processing" text="Đang hoạt động" />
                    </Descriptions.Item>
                </Descriptions>
            </Card>
        </div>
    );
};
