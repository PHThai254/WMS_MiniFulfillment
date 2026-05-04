import React from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface BaseTableProps<T extends object> extends Omit<TableProps<T>, 'columns'> {
    columns: ColumnsType<T>;
    dataSource?: T[];
    loading?: boolean;
    pagination?: any;
    onChange?: (pagination: any, filters: any, sorter: any) => void;
}

/**
 * BaseTable - Base component for all data tables
 * MANDATORY: Use this component instead of direct Ant Design Table
 */
export const BaseTable = React.forwardRef<any, BaseTableProps<any>>(
    (
        {
            columns,
            dataSource,
            loading = false,
            pagination,
            onChange,
            ...props
        },
        ref
    ) => {
        return (
            <Table
                ref={ref}
                columns={columns}
                dataSource={dataSource}
                loading={loading}
                pagination={pagination || { pageSize: 20, showSizeChanger: true, showTotal: (total) => `Total ${total}` }}
                onChange={onChange}
                rowKey="id"
                scroll={{ x: 1200 }}
                {...props}
            />
        );
    }
);

BaseTable.displayName = 'BaseTable';
