"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DownloadOutlined,
  PlusOutlined,
  SettingOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useCreateRole, useDeleteRole, useRoles, useUpdateRole, ROLE_KEYS } from "@/hooks/useRoleTrpc";
import type { TableColumnsType } from "antd";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  Modal,
  Tooltip,
} from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Role {
  id: number;
  roleCode: string;
  roleName: string;
  description?: string;
  userCount: number;
}

type RoleFormValues = {
  roleCode: string;
  roleName: string;
  description?: string;
};

export default function RolesPage() {
  const { can, isAdmin } = usePermissions();
  const router = useRouter();
  const {
    reset,
    applyFilter,
    updateQueries,
    query,
    pagination,
    handlePageChange,
  } = useFilter();
  const {
    data: rolesData = [],
    isLoading,
    isFetching,
  } = useRoles();

  const roles = rolesData.map(role => ({
    ...role,
    description: role.description || undefined,
    userCount: 0, // TODO: Add user count logic if needed
  }));

  const createMutation = useCreateRole();

  const updateMutation = useUpdateRole();

  const deleteMutation = useDeleteRole();

  const filtered = applyFilter<Role>(roles);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Role | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const { modal } = App.useApp();
  const handleView = (row: Role) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelected(null);
    setModalOpen(true);
  };

  const handleEdit = (row: Role) => {
    // Nếu không phải ADMIN, không cho edit role level 4-5
    if (!isAdmin) {
      modal.warning({
        title: "Không có quyền",
        content: "Chỉ Admin mới có thể chỉnh sửa vai trò cấp cao (Level 4-5)",
      });
      return;
    }
    setModalMode("edit");
    setSelected(row);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa vai trò này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate({ id }),
    });
  };

  const handleSubmit = (values: RoleFormValues) => {
    values.roleCode = values.roleCode.trim().toUpperCase();
    if (modalMode === "create") {
      createMutation.mutate({
        roleCode: values.roleCode,
        roleName: values.roleName,
        description: values.description,
      }, { onSuccess: () => setModalOpen(false) });
    } else if (selected) {
      updateMutation.mutate({
        id: selected.id,
        roleName: values.roleName,
        description: values.description,
      }, { onSuccess: () => setModalOpen(false) });
    }
  };

  const columnsAll: TableColumnsType<Role> = [
    {
      title: "Mã",
      dataIndex: "roleCode",
      key: "roleCode",
      width: 100,
    },
    {
      title: "Tên",
      dataIndex: "roleName",
      key: "roleName",
      width: 220,
      fixed: "left",
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      width: 220,
      render: (value: string) => (
        <Tooltip title={value || "-"}>
          <span className="truncate block max-w-[200px]">{value || "-"}</span>
        </Tooltip>
      ),
    },
    {
      title: "Lượng người dùng",
      dataIndex: "userCount",
      key: "userCount",
      width: 140,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 160,
      fixed: "right",
      render: (_value: unknown, record: Role) => {
        return (
          <TableActions
            onView={() => handleView(record)}
            onEdit={() => handleEdit(record)}
            onDelete={() => handleDelete(record.id)}
            extraActions={[
              {
                title: "Sửa quyền hạn",
                icon: <SettingOutlined />,
                onClick: () => {
                  router.push(`/admin/roles/${record.id}/permissions`);
                },
                can: isAdmin,
              },
            ]}
            canEdit={isAdmin}
            canDelete={isAdmin}
          />
        );
      },
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  return (
    <>
      <WrapperContent<Role>
        isNotAccessible={!isAdmin}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["roles"],
          buttonEnds: [
            {
              can: isAdmin,
              type: "primary",
              name: "Thêm",
              onClick: handleCreate,
              icon: <PlusOutlined />,
            },
            {
              can: isAdmin,

              type: "default",
              name: "Xuất Excel",
              onClick: () => {},
              icon: <DownloadOutlined />,
            },
            {
              can: isAdmin,
              type: "default",
              name: "Nhập Excel",
              onClick: () => {},
              icon: <UploadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm kiếm vai trò",
            filterKeys: ["roleName", "roleCode", "description"],
          },
          filters: {
            fields: [],
            onApplyFilter: (arr) => updateQueries(arr),
            onReset: () => reset(),
            query,
          },
          columnSettings: {
            columns: columnsCheck,
            onChange: (c) => updateColumns(c),
            onReset: () => resetColumns(),
          },
        }}
      >
        <CommonTable
          pagination={{
            ...pagination,
            onChange: handlePageChange,
          }}

          columns={getVisibleColumns()}
          dataSource={filtered}
          loading={isLoading || isFetching || deleteMutation.isPending}
          paging
          rank
        />
      </WrapperContent>

      <Drawer
        size={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Chi tiết vai trò"
      >
        {selected ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Mã vai trò">
              {selected.roleCode}
            </Descriptions.Item>
            <Descriptions.Item label="Tên vai trò">
              {selected.roleName}
            </Descriptions.Item>
            <Descriptions.Item label="Mô tả">
              {selected.description || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Số người dùng">
              {selected.userCount}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>

      <Modal
        title={modalMode === "create" ? "Tạo vai trò" : "Sửa vai trò"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        key={selected?.id || "create"}
        destroyOnHidden
      >
        <RoleForm
          editing={modalMode === "edit"}
          initialValues={
            selected
              ? {
                  roleCode: selected.roleCode,
                  roleName: selected.roleName,
                  description: selected.description,
                }
              : {}
          }
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </>
  );
}

function RoleForm({
  editing,
  initialValues,
  onCancel,
  onSubmit,
  loading,
}: {
  editing?: boolean;
  initialValues?: Partial<RoleFormValues>;
  onCancel: () => void;
  onSubmit: (v: RoleFormValues) => void;
  loading?: boolean;
}) {
  const [form] = Form.useForm<RoleFormValues>();
  const { isAdmin } = usePermissions();

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={(v) => onSubmit(v as RoleFormValues)}
    >
      <Form.Item
        name="roleCode"
        label="Mã vai trò"
        rules={[{ required: true, message: "Vui lòng nhập mã vai trò" }]}
      >
        <Input
          hidden={!isAdmin}
          disabled={editing}
          placeholder="VD: MANAGER, STAFF"
        />
      </Form.Item>
      <Form.Item
        name="roleName"
        label="Tên vai trò"
        rules={[{ required: true, message: "Vui lòng nhập tên vai trò" }]}
      >
        <Input />
      </Form.Item>
      <Form.Item name="description" label="Mô tả">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Alert
        title="Quyền tự động"
        description="Khi tạo/sửa role, hệ thống sẽ tự động cấp quyền theo cấp độ đã chọn. Bạn có thể tinh chỉnh thêm ở trang 'Phân quyền'."
        type="info"
        showIcon
        className="mb-4"
      />
      <Divider />
      <div className="flex gap-2 justify-end">
        <Button onClick={onCancel}>Hủy</Button>
        <Button type="primary" htmlType="submit" loading={loading}>
          Lưu
        </Button>
      </div>
    </Form>
  );
}
