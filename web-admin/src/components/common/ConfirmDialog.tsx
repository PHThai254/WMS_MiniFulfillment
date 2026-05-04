import React from 'react';
import { Alert, Modal } from 'antd';
import type { ModalProps } from 'antd';

interface ConfirmDialogProps extends Omit<ModalProps, 'title' | 'icon'> {
    title?: string;
    message: string;
    okText?: string;
    cancelText?: string;
    onOk: () => void;
    onCancel?: () => void;
    loading?: boolean;
    danger?: boolean;
}

/**
 * ConfirmDialog - Base component for delete/confirmation dialogs
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    title = 'Confirm',
    message,
    okText = 'OK',
    cancelText = 'Cancel',
    onOk,
    onCancel,
    loading = false,
    danger = false,
    ...props
}) => {
    return (
        <Modal
            title={title}
            open={props.open}
            onOk={onOk}
            onCancel={onCancel}
            okText={okText}
            cancelText={cancelText}
            confirmLoading={loading}
            okButtonProps={{ danger, loading }}
            {...props}
        >
            <Alert
                type={danger ? 'error' : 'warning'}
                message={message}
                showIcon
            />
        </Modal>
    );
};
