import React from 'react';
import { Modal } from 'antd';
import type { FormInstance } from 'antd';

interface FormModalProps {
    title: string;
    visible: boolean;
    loading?: boolean;
    form?: FormInstance;
    onSubmit: () => void;
    onCancel: () => void;
    children: React.ReactNode;
    okText?: string;
    cancelText?: string;
}

/**
 * FormModal - Base component for form dialogs
 * MANDATORY: Use this component for all add/edit modals
 */
export const FormModal: React.FC<FormModalProps> = ({
    title,
    visible,
    loading = false,
    form,
    onSubmit,
    onCancel,
    children,
    okText = 'Save',
    cancelText = 'Cancel',
}) => {
    const handleOk = () => {
        if (form) {
            form.submit();
        } else {
            onSubmit();
        }
    };

    return (
        <Modal
            title={title}
            open={visible}
            onOk={handleOk}
            onCancel={onCancel}
            confirmLoading={loading}
            okText={okText}
            cancelText={cancelText}
            width={600}
        >
            {children}
        </Modal>
    );
};
