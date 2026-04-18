// src/components/PageHeader.tsx
import { Typography, Row, Col, Space } from 'antd';

const { Title } = Typography;

interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode; // Khu vực chứa nút bấm (Thêm mới, Export...)
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, actions }) => {
  return (
    <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
      <Col>
        <Title level={3} style={{ margin: 0 }}>
          {title}
        </Title>
      </Col>
      <Col>
        {/* Nếu có nút hành động thì render, các nút sẽ cách nhau 16px */}
        {actions && <Space size="middle">{actions}</Space>}
      </Col>
    </Row>
  );
};