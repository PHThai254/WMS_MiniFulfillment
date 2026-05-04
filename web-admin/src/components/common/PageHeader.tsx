import React from 'react';
import { Row, Col, Space, Typography } from 'antd';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    extra?: React.ReactNode;
}

/**
 * PageHeader - Base component for page title + actions
 * MANDATORY: Use this component for every page header
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    extra,
}) => {
    return (
        <Row justify="space-between" align="middle" gutter={16}>
            <Col flex="auto">
                <Space direction="vertical" size="small">
                    <Typography.Title level={3}>{title}</Typography.Title>
                    {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
                </Space>
            </Col>
            {extra && (
                <Col>
                    <Space>{extra}</Space>
                </Col>
            )}
        </Row>
    );
};
