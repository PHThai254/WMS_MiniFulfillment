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
            message.success('Login successful');
            navigate('/dashboard');
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <Space direction="vertical" size="small">
                <Typography.Title level={3}>WMS Admin</Typography.Title>
                <Typography.Text type="secondary">Warehouse Management System</Typography.Text>
            </Space>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleLogin}
                autoComplete="off"
            >
                <Form.Item
                    name="username"
                    rules={[{ required: true, message: 'Please enter username' }]}
                >
                    <Input
                        prefix={<UserOutlined />}
                        placeholder="Username"
                        size="large"
                        disabled={loading}
                    />
                </Form.Item>

                <Form.Item
                    name="password"
                    rules={[{ required: true, message: 'Please enter password' }]}
                >
                    <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="Password"
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
                        Login
                    </PrimaryButton>
                </Form.Item>
            </Form>

            <Space direction="vertical" size="small">
                <Typography.Text type="secondary">Demo credentials:</Typography.Text>
                <Typography.Text type="secondary">Username: admin | Password: admin123</Typography.Text>
            </Space>
        </AuthLayout>
    );
};
