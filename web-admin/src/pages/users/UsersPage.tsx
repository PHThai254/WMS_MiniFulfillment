import React, { useEffect, useState, useCallback } from 'react';
import {
    Modal, Form, Input, Select, Button, Space, Tag, message, Row, Col, Popconfirm
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseTable } from '../../components/common/BaseTable';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { userService } from '../../services/operationServices';
import { warehouseService } from '../../services/warehouseService';
import type { IUser, IRole, IWarehouse } from '../../types/domain';

const { Option } = Select;

const ROLE_COLOR: Record<string, string> = { Admin: 'red', QA_QC: 'blue', Staff: 'green' };

export const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<IUser[]>([]);
    const [roles, setRoles] = useState<IRole[]>([]);
    const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [pwModalOpen, setPwModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<IUser | null>(null);
    const [form] = Form.useForm();
    const [pwForm] = Form.useForm();
    // Lắng nghe sự thay đổi của ô Vai trò
    const selectedRoleId = Form.useWatch('roleId', form);
    const isAdminSelected = roles.find(r => r.id === selectedRoleId)?.name === 'Admin';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [uRes, rRes, wRes] = await Promise.all([userService.list(), userService.getRoles(), warehouseService.list()]);
            if (uRes?.success) setUsers(uRes.data || []);
            if (rRes?.success) setRoles(rRes.data || []);
            if (wRes?.success) setWarehouses(wRes.data || []);
        } catch { message.error('Không thể tải dữ liệu.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreateModal = () => {
        setEditingUser(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEditModal = (user: IUser) => {
        setEditingUser(user);
        form.setFieldsValue({ username: user.username, roleId: user.roleId, warehouseId: user.warehouseId });
        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            if (editingUser) {
                await userService.update(editingUser.id, { username: values.username, roleId: values.roleId, warehouseId: values.warehouseId });
                message.success('Cập nhật người dùng thành công!');
            } else {
                await userService.create({ username: values.username, password: values.password, roleId: values.roleId, warehouseId: values.warehouseId });
                message.success('Tạo người dùng thành công!');
            }
            setModalOpen(false);
            fetchData();
        } catch { message.error('Thao tác thất bại.'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        await userService.delete(id);
        message.success('Xóa người dùng thành công!');
        fetchData();
    };

    const handleChangePassword = async () => {
        if (!editingUser) return;
        try {
            const values = await pwForm.validateFields();
            await userService.changePassword(editingUser.id, values.newPassword);
            message.success('Đổi mật khẩu thành công!');
            setPwModalOpen(false);
        } catch { message.error('Thất bại.'); }
    };

    const columns = [
        { title: 'Username', dataIndex: 'username', key: 'username', render: (v: string) => <strong>{v}</strong> },
        {
            title: 'Vai trò', dataIndex: 'roleName', key: 'roleName',
            render: (r: string) => <Tag color={ROLE_COLOR[r] || 'default'}>{r}</Tag>
        },
        { title: 'Kho được gán', dataIndex: 'warehouseName', key: 'warehouseName', render: (v?: string) => v || <span style={{ color: '#999' }}>Toàn bộ (Admin)</span> },
        {
            title: 'Hành động', key: 'action',
            render: (_: unknown, record: IUser) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEditModal(record)}>Sửa</Button>
                    <Button icon={<KeyOutlined />} size="small" onClick={() => { setEditingUser(record); pwForm.resetFields(); setPwModalOpen(true); }}>Mật khẩu</Button>
                    <Popconfirm title="Xác nhận xóa người dùng này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
                        <Button icon={<DeleteOutlined />} size="small" danger>Xóa</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <PageHeader title="Quản lý Nhân sự" subtitle="Tạo tài khoản, gán Role và phân kho cho nhân viên" />

            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                <Input.Search placeholder="Tìm username..." style={{ width: 250 }} allowClear />
                <PrimaryButton icon={<PlusOutlined />} onClick={openCreateModal}>Thêm nhân viên</PrimaryButton>
            </Space>

            <BaseTable columns={columns} dataSource={users} rowKey="id" loading={loading} />

            {/* Modal Tạo/Sửa User */}
            <Modal
                title={editingUser ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setModalOpen(false)}>Hủy</Button>,
                    <Button key="save" type="primary" loading={saving} onClick={handleSave}>Lưu</Button>
                ]}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Nhập username' }]}>
                        <Input placeholder="Nhập username" />
                    </Form.Item>
                    {!editingUser && (
                        <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
                            <Input.Password placeholder="Nhập mật khẩu" />
                        </Form.Item>
                    )}
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="roleId" label="Vai trò" rules={[{ required: true, message: 'Chọn vai trò' }]}>
                                <Select 
                                    placeholder="Chọn vai trò"
                                    onChange={(val) => {
                                        // Nếu đổi sang Admin thì tự động xóa trắng ô Kho
                                        const selectedRole = roles.find(r => r.id === val);
                                        if (selectedRole?.name === 'Admin') {
                                            form.setFieldsValue({ warehouseId: undefined });
                                        }
                                    }}
                                >
                                    {roles.map(r => <Option key={r.id} value={r.id}>{r.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="warehouseId" label="Kho được gán">
                                <Select 
                                    placeholder="Để trống nếu là Admin" 
                                    allowClear
                                    disabled={isAdminSelected} // Tự động khóa mờ nếu là Admin
                                >
                                    {warehouses.map(w => <Option key={w.id} value={w.id}>{w.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* Modal Đổi mật khẩu */}
            <Modal title="Đổi mật khẩu" open={pwModalOpen} onCancel={() => setPwModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setPwModalOpen(false)}>Hủy</Button>,
                    <Button key="save" type="primary" onClick={handleChangePassword}>Đổi mật khẩu</Button>
                ]}>
                <Form form={pwForm} layout="vertical">
                    <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, message: 'Nhập mật khẩu mới' }, { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' }]}>
                        <Input.Password placeholder="Nhập mật khẩu mới" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
