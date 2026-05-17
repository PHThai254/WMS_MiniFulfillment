import React, { useState } from 'react';
import { Form, Input, message, Space, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AuthLayout } from '../../components/layouts/AuthLayout';
import { PrimaryButton } from '../../components/common/PrimaryButton';

export const LoginPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const handleLogin = async (values: { username: string; password: string }) => {
        setLoading(true);
        try {
            await login(values.username, values.password);
            message.success('Đăng nhập thành công');
            navigate('/dashboard');
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <Space direction="vertical" size="small">
                <Typography.Title level={3}>Quản trị WMS</Typography.Title>
                <Typography.Text type="secondary">Hệ thống Quản lý Kho</Typography.Text>
            </Space>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleLogin}
                autoComplete="off"
            >
                <Form.Item
                    name="username"
                    rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
                >
                    <Input
                        prefix={<UserOutlined />}
                        placeholder="Tên đăng nhập"
                        size="large"
                        disabled={loading}
                    />
                </Form.Item>

                <Form.Item
                    name="password"
                    rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                >
                    <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="Mật khẩu"
                        size="large"
                        disabled={loading}
                    />
                </Form.Item>

                <Form.Item>
                    <PrimaryButton
                        htmlType="submit"
                        block
                        loading={loading}
                    >
                        Đăng nhập
                    </PrimaryButton>
                </Form.Item>
            </Form>

            <Space direction="vertical" size="small">
                <Typography.Text type="secondary">Tài khoản mẫu:</Typography.Text>
                <Typography.Text type="secondary">Tên đăng nhập: admin | Mật khẩu: admin123</Typography.Text>
            </Space>
        </AuthLayout>
    );
};
