import React from 'react';
import { Layout, Row, Col, Card } from 'antd';

interface AuthLayoutProps {
    children: React.ReactNode;
}

/**
 * AuthLayout - Centered layout for login/auth pages
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
    return (
        <Layout>
            <Layout.Content>
                <Row justify="center" align="middle">
                    <Col xs={22} sm={16} md={12} lg={8} xl={6}>
                        <Card>{children}</Card>
                    </Col>
                </Row>
            </Layout.Content>
        </Layout>
    );
};
