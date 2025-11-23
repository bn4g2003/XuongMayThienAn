"use client";

import React, { useState } from "react";
import {
  Button,
  Drawer,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Dropdown,
  Descriptions,
  Switch,
  App,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import WrapperContent from "@/components/WrapperContent";
import CommonTable from "@/components/CommonTable";
import useFilter from "@/hooks/useFilter";
import useColumn from "@/hooks/useColumn";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBranches } from "@/hooks/useCommonQuery";

interface Warehouse {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  branchId: number;
  branchName: string;
  address?: string;
  warehouseType: "NVL" | "THANH_PHAM";
  isActive: boolean;
}

type WarehouseFormValues = {
  warehouseCode: string;
  warehouseName: string;
  branchId: number | string;
  address?: string;
  warehouseType: "NVL" | "THANH_PHAM";
  isActive?: boolean;
};

export default function WarehousesPage() {
  const { can } = usePermissions();
  const { data: branches = [] } = useBranches();
  const { reset, applyFilter, updateQueries, query } = useFilter();
  const queryClient = useQueryClient();

  const {
    data: warehouses = [],
    isLoading,
    isFetching,
  } = useQuery<Warehouse[]>({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/admin/warehouses");
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WarehouseFormValues) => {
      const res = await fetch("/api/admin/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<WarehouseFormValues>;
    }) => {
      const res = await fetch(`/api/admin/warehouses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["warehouses"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/warehouses/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["warehouses"] }),
  });

  const filtered = applyFilter<Warehouse>(warehouses);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Warehouse | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const { modal } = App.useApp();
  const handleView = (row: Warehouse) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelected(null);
    setModalOpen(true);
  };

  const handleEdit = (row: Warehouse) => {
    setModalMode("edit");
    setSelected(row);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa kho này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleSubmit = (values: WarehouseFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate(values, { onSuccess: () => setModalOpen(false) });
    } else if (selected) {
      updateMutation.mutate(
        { id: selected.id, data: values },
        { onSuccess: () => setModalOpen(false) }
      );
    }
  };

  const columnsAll: TableColumnsType<Warehouse> = [
    {
      title: "Mã kho",
      dataIndex: "warehouseCode",
      key: "warehouseCode",
      width: 140,
    },
    {
      title: "Tên kho",
      dataIndex: "warehouseName",
      key: "warehouseName",
      width: 220,
    },
    {
      title: "Loại kho",
      dataIndex: "warehouseType",
      key: "warehouseType",
      width: 160,
      render: (val: Warehouse["warehouseType"]) => (
        <Tag color={val === "NVL" ? "purple" : "green"}>
          {val === "NVL" ? "NVL" : "TP"}
        </Tag>
      ),
    },
    {
      title: "Chi nhánh",
      dataIndex: "branchName",
      key: "branchName",
      width: 180,
    },
    { title: "Địa chỉ", dataIndex: "address", key: "address" },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (v: boolean) => (
        <Tag color={v ? "success" : "error"}>{v ? "Hoạt động" : "Khóa"}</Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_value: unknown, record: Warehouse) => {
        const menuItems = [
          {
            key: "view",
            label: "Xem",
            onClick: () => handleView(record),
            icon: <EyeOutlined />,
          },
        ];
        if (can("admin.warehouses", "edit"))
          menuItems.push({
            key: "edit",
            label: "Sửa",
            onClick: () => handleEdit(record),
            icon: <EditOutlined />,
          });
        if (can("admin.warehouses", "delete"))
          menuItems.push({
            key: "delete",
            label: "Xóa",
            onClick: () => handleDelete(record.id),
            icon: <DeleteOutlined />,
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
      <WrapperContent<Warehouse>
        isNotAccessible={!can("admin.warehouses", "view")}
        isLoading={isLoading}
        header={{
          buttonEnds: can("admin.warehouses", "create")
            ? [
                {
                  type: "primary",
                  name: "Thêm",
                  onClick: handleCreate,
                  icon: <PlusOutlined />,
                },
              ]
            : undefined,
          searchInput: {
            placeholder: "Tìm kiếm kho",
            filterKeys: [
              "warehouseName",
              "warehouseCode",
              "branchName",
              "address",
            ],
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
        title="Chi tiết kho"
      >
        {selected ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Mã kho">
              {selected.warehouseCode}
            </Descriptions.Item>
            <Descriptions.Item label="Tên kho">
              {selected.warehouseName}
            </Descriptions.Item>
            <Descriptions.Item label="Chi nhánh">
              {selected.branchName}
            </Descriptions.Item>
            <Descriptions.Item label="Loại kho">
              {selected.warehouseType}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">
              {selected.address || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {selected.isActive ? "Hoạt động" : "Khóa"}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>

      <Modal
        title={modalMode === "create" ? "Tạo kho" : "Sửa kho"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        key={selected?.id || "create"}
        destroyOnHidden
      >
        <WarehouseForm
          initialValues={
            selected
              ? {
                  warehouseCode: selected.warehouseCode,
                  warehouseName: selected.warehouseName,
                  branchId: selected.branchId,
                  address: selected.address,
                  warehouseType: selected.warehouseType,
                  isActive: selected.isActive,
                }
              : {
                  warehouseType:
                    "THANH_PHAM" as WarehouseFormValues["warehouseType"],
                  isActive: true,
                }
          }
          branches={branches}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </>
  );
}

function WarehouseForm({
  initialValues,
  branches,
  onCancel,
  onSubmit,
  loading,
}: {
  initialValues?: Partial<WarehouseFormValues>;
  branches: { id: number; branchName: string }[];
  onCancel: () => void;
  onSubmit: (v: WarehouseFormValues) => void;
  loading?: boolean;
}) {
  const [form] = Form.useForm<WarehouseFormValues>();

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={(v) => onSubmit(v as WarehouseFormValues)}
    >
      <Form.Item
        name="warehouseCode"
        label="Mã kho"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="warehouseName"
        label="Tên kho"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="warehouseType"
        label="Loại kho"
        rules={[{ required: true }]}
      >
        <Select>
          <Select.Option value="THANH_PHAM">✨ Kho thành phẩm</Select.Option>
          <Select.Option value="NVL">📦 Kho nguyên vật liệu</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item name="branchId" label="Chi nhánh" rules={[{ required: true }]}>
        <Select>
          {branches.map((b) => (
            <Select.Option key={b.id} value={b.id}>
              {b.branchName}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="address" label="Địa chỉ">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
        <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
      </Form.Item>
      <div className="flex gap-2 justify-end">
        <Button onClick={onCancel}>Hủy</Button>
        <Button type="primary" htmlType="submit" loading={loading}>
          Lưu
        </Button>
      </div>
    </Form>
  );
}
