"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  App,
  Button,
  Descriptions,
  Drawer,
  Dropdown,
  Form,
  Input,
  Modal,
  Tag,
  Tooltip,
} from "antd";
import { useState } from "react";

interface Role {
  id: number;
  roleCode: string;
  roleName: string;
  description?: string;
  level: number;
  userCount: number;
}

type RoleFormValues = {
  roleCode: string;
  roleName: string;
  description?: string;
  level: number;
};

export default function RolesPage() {
  const { can, isAdmin } = usePermissions();
  const { reset, applyFilter, updateQueries, query } = useFilter();
  const queryClient = useQueryClient();

  const {
    data: roles = [],
    isLoading,
    isFetching,
  } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles");
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: RoleFormValues) => {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<RoleFormValues>;
    }) => {
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });

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
    if (!isAdmin && row.level > 3) {
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
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleSubmit = (values: RoleFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate(values, { onSuccess: () => setModalOpen(false) });
    } else if (selected) {
      updateMutation.mutate(
        { id: selected.id, data: values },
        { onSuccess: () => setModalOpen(false) }
      );
    }
  };

  const columnsAll: TableColumnsType<Role> = [
    {
      title: "Mã vai trò",
      dataIndex: "roleCode",
      key: "roleCode",
      width: 140,
    },
    {
      title: "Tên vai trò",
      dataIndex: "roleName",
      key: "roleName",
      width: 220,
    },
    {
      title: "Cấp độ",
      dataIndex: "level",
      key: "level",
      width: 100,
      render: (level: number) => {
        const levelMap: Record<number, { text: string; color: string }> = {
          1: { text: "Level 1", color: "default" },
          2: { text: "Level 2", color: "blue" },
          3: { text: "Level 3", color: "cyan" },
          4: { text: "Level 4", color: "orange" },
          5: { text: "Level 5", color: "red" },
        };
        const info = levelMap[level] || { text: `Level ${level}`, color: "default" };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
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
      title: "Số người dùng",
      dataIndex: "userCount",
      key: "userCount",
      width: 140,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_value: unknown, record: Role) => {
        const menuItems = [
          {
            key: "view",
            label: "Xem",
            icon: <EyeOutlined />,
            onClick: () => handleView(record),
          },
        ];
        // Chỉ cho edit nếu có quyền VÀ (là ADMIN hoặc role level <= 3)
        const canEditThisRole = can("admin.roles", "edit") &&
          (isAdmin || record.level <= 3);

        if (canEditThisRole)
          menuItems.push({
            key: "edit",
            label: "Sửa",
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          });
        if (can("admin.roles", "delete") && record.userCount === 0)
          menuItems.push({
            key: "delete",
            label: "Xóa",
            icon: <DeleteOutlined />,
            onClick: () => handleDelete(record.id),
          });

        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={["click"]}
            placement="bottomLeft"
          >
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        );
      },
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  return (
    <>
      <WrapperContent<Role>
        isNotAccessible={!can("admin.roles", "view")}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["roles"],
          buttonEnds: can("admin.roles", "create")
            ? [
                {
                  type: "primary",
                  name: "Thêm",
                  onClick: handleCreate,
                  icon: <PlusOutlined />,
                },
                {
                  type: "default",
                  name: "Xuất Excel",
                  onClick: () => {},
                  icon: <DownloadOutlined />,
                },
                {
                  type: "default",
                  name: "Nhập Excel",
                  onClick: () => {},
                  icon: <UploadOutlined />,
                },
              ]
            : undefined,
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
          initialValues={
            selected
              ? {
                  roleCode: selected.roleCode,
                  roleName: selected.roleName,
                  description: selected.description,
                  level: selected.level || 3,
                }
              : { level: 3 }
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
  initialValues,
  onCancel,
  onSubmit,
  loading,
}: {
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
        <Input placeholder="VD: MANAGER, STAFF" />
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
      <Form.Item
        name="level"
        label="Cấp độ quyền"
        rules={[{ required: true, message: "Vui lòng chọn cấp độ" }]}
        initialValue={3}
      >
        <select className="w-full px-3 py-2 border rounded">
          <option value={1}>Level 1 - Nhân viên cơ bản (Chỉ xem)</option>
          <option value={2}>Level 2 - Nhân viên (Xem + Tạo)</option>
          <option value={3}>Level 3 - Trưởng nhóm (Xem + Tạo + Sửa)</option>
          {isAdmin && (
            <>
              <option value={4}>Level 4 - Quản lý (Xem + Tạo + Sửa + Xóa)</option>
              <option value={5}>Level 5 - Giám đốc (Full quyền)</option>
            </>
          )}
        </select>
      </Form.Item>
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
        <p className="font-medium text-blue-900 mb-1">💡 Quyền tự động</p>
        <p className="text-blue-700">
          Khi tạo/sửa role, hệ thống sẽ tự động cấp quyền theo cấp độ đã chọn.
          Bạn có thể tinh chỉnh thêm ở trang "Phân quyền".
        </p>
        {!isAdmin && (
          <p className="text-orange-600 mt-2">
            ⚠️ Bạn chỉ có thể tạo/sửa vai trò Level 1-3. Liên hệ Admin để tạo vai trò cấp cao hơn.
          </p>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button onClick={onCancel}>Hủy</Button>
        <Button type="primary" htmlType="submit" loading={loading}>
          Lưu
        </Button>
      </div>
    </Form>
  );
}
