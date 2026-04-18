// web-admin/src/components/BaseTable.tsx
import { Table, type TableProps } from 'antd';

export const BaseTable = <T extends object>({ columns, dataSource, loading, ...props }: TableProps<T>) => {
  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      pagination={{
        defaultPageSize: 10,
        showSizeChanger: true,
        // Đã thêm ": number" để fix lỗi TypeScript
        showTotal: (total: number) => `Tổng cộng ${total} dòng`, 
      }}
      scroll={{ x: 'max-content' }}
      bordered
      {...props}
    />
  );
};