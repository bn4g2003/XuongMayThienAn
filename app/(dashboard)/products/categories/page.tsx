"use client";

import React, { useState } from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Dropdown,
  Descriptions,
  App,
  Modal,
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

interface Category {
  id: number;
  categoryCode: string;
  categoryName: string;
  parentId?: number;
  parentName?: string;
  description?: string;
}

type CategoryFormValues = {
  categoryCode: string;
  categoryName: string;
  parentId?: number | string;
  description?: string;
};

export default function CategoriesPage() {
  const { can } = usePermissions();
  const { reset, applyFilter, updateQueries, query } = useFilter();
  const queryClient = useQueryClient();
  const { modal } = App.useApp();

  const {
    data: categories = [],
    isLoading,
    isFetching,
  } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/products/categories");
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const res = await fetch("/api/products/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CategoryFormValues>;
    }) => {
      const res = await fetch(`/api/products/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/categories/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const filtered = applyFilter<Category>(categories);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  const handleView = (row: Category) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelected(null);
    setModalOpen(true);
  };

  const handleEdit = (row: Category) => {
    setModalMode("edit");
    setSelected(row);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa danh mục này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleSubmit = (values: CategoryFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate(values, { onSuccess: () => setModalOpen(false) });
    } else if (selected) {
      updateMutation.mutate(
        { id: selected.id, data: values },
        { onSuccess: () => setModalOpen(false) }
      );
    }
  };

  const columnsAll: TableColumnsType<Category> = [
    {
      title: "Mã danh mục",
      dataIndex: "categoryCode",
      key: "categoryCode",
      width: 140,
    },
    {
      title: "Tên danh mục",
      dataIndex: "categoryName",
      key: "categoryName",
      width: 220,
    },
    {
      title: "Danh mục cha",
      dataIndex: "parentName",
      key: "parentName",
      width: 180,
      render: (val: string | undefined) => val || "-",
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      render: (val: string | undefined) => val || "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_value: unknown, record: Category) => {
        const menuItems = [
          {
            key: "view",
            label: "Xem",
            icon: <EyeOutlined />,
            onClick: () => handleView(record),
          },
        ];
        if (can("products.categories", "edit"))
          menuItems.push({
            key: "edit",
            label: "Sửa",
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          });
        if (can("products.categories", "delete"))
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
      <WrapperContent<Category>
        isNotAccessible={!can("products.categories", "view")}
        isLoading={isLoading}
        header={{
          buttonEnds: can("products.categories", "create")
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
            placeholder: "Tìm kiếm danh mục",
            filterKeys: ["categoryName", "categoryCode", "description"],
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
        title="Chi tiết danh mục"
      >
        {selected ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Mã danh mục">
              {selected.categoryCode}
            </Descriptions.Item>
            <Descriptions.Item label="Tên danh mục">
              {selected.categoryName}
            </Descriptions.Item>
            <Descriptions.Item label="Danh mục cha">
              {selected.parentName || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Mô tả">
              {selected.description || "-"}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>

      <Modal
        title={modalMode === "create" ? "Tạo danh mục" : "Sửa danh mục"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        key={selected?.id || "create"}
        destroyOnHidden
      >
        <CategoryForm
          mode={modalMode}
          initialValues={
            selected
              ? {
                  categoryCode: selected.categoryCode,
                  categoryName: selected.categoryName,
                  parentId: selected.parentId,
                  description: selected.description,
                }
              : undefined
          }
          categories={categories}
          excludeId={selected?.id}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </>
  );
}

function CategoryForm({
  mode,
  initialValues,
  categories,
  excludeId,
  onCancel,
  onSubmit,
  loading,
}: {
  mode: "create" | "edit";
  initialValues?: Partial<CategoryFormValues>;
  categories: Category[];
  excludeId?: number;
  onCancel: () => void;
  onSubmit: (v: CategoryFormValues) => void;
  loading?: boolean;
}) {
  const [form] = Form.useForm<CategoryFormValues>();

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={(v) => onSubmit(v as CategoryFormValues)}
    >
      <Form.Item
        name="categoryCode"
        label="Mã danh mục"
        rules={[{ required: true, message: "Vui lòng nhập mã danh mục" }]}
      >
        <Input disabled={mode === "edit"} />
      </Form.Item>
      <Form.Item
        name="categoryName"
        label="Tên danh mục"
        rules={[{ required: true, message: "Vui lòng nhập tên danh mục" }]}
      >
        <Input />
      </Form.Item>
      <Form.Item name="parentId" label="Danh mục cha">
        <Select allowClear placeholder="-- Không có --">
          {categories
            .filter((c) => c.id !== excludeId)
            .map((cat) => (
              <Select.Option key={cat.id} value={cat.id}>
                {cat.categoryName}
              </Select.Option>
            ))}
        </Select>
      </Form.Item>
      <Form.Item name="description" label="Mô tả">
        <Input.TextArea rows={3} />
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
