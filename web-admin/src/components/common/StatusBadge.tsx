import React from 'react';
import { Badge } from 'antd';

interface StatusBadgeProps {
    status: string;
    statusMap?: Record<string, { color: string; text: string }>;
}

const DEFAULT_STATUS_MAP: Record<string, { color: string; text: string }> = {
    // Receipt status
    DRAFT: { color: 'default', text: 'Draft' },
    QC_CHECKED: { color: 'processing', text: 'QC Checked' },
    COMPLETED: { color: 'success', text: 'Completed' },
    REJECTED: { color: 'error', text: 'Rejected' },

    // Issue status
    PICKING: { color: 'processing', text: 'Picking' },
    PICKED: { color: 'processing', text: 'Picked' },
    HANDOVER: { color: 'warning', text: 'Handover' },

    // General
    ACTIVE: { color: 'success', text: 'Active' },
    INACTIVE: { color: 'default', text: 'Inactive' },
    PENDING: { color: 'warning', text: 'Pending' },
    FAILED: { color: 'error', text: 'Failed' },
};

/**
 * StatusBadge - Display status with color coding
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    statusMap = DEFAULT_STATUS_MAP,
}) => {
    const mapping = statusMap[status] || DEFAULT_STATUS_MAP.PENDING;
    return <Badge status={mapping.color as any} text={mapping.text} />;
};
