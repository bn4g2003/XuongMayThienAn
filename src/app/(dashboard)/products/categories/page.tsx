"use client";

import CategoryForm from "@/components/categories/CategoryForm";
import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { Category, CategoryFormValues } from "@/types/category";
import {
  DownloadOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useCreateProductCategory, useDeleteProductCategory, useProductCategories, useUpdateProductCategory } from "@/hooks/useProductCategoryTrpc";
import type { TableColumnsType } from "antd";
import { App, Descriptions, Drawer, Modal } from "antd";
import { useState } from "react";

export default function CategoriesPage() {
  const { can } = usePermissions();
  const {
    reset,
    applyFilter,
    updateQueries,
    query,
    pagination,
    handlePageChange,
  } = useFilter();
  const { modal } = App.useApp();
  const { data: categories = [], isLoading, isFetching } = useProductCategories();

  const createMutation = useCreateProductCategory();
  const updateMutation = useUpdateProductCategory();
  const deleteMutation = useDeleteProductCategory();

  const categoriesData = categories.map(category => ({
    ...category,
    parentId: category.parentId || undefined,
    parentName: category.parentName || undefined,
    description: category.description || undefined,
  }));

  const filtered = applyFilter<Category>(categoriesData);

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
      onOk: () => deleteMutation.mutate({ id }),
    });
  };

  const handleSubmit = (values: CategoryFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate({
        categoryCode: values.categoryCode,
        categoryName: values.categoryName,
        parentId: typeof values.parentId === 'string' ? parseInt(values.parentId) : values.parentId,
        description: values.description,
      }, { onSuccess: () => setModalOpen(false) });
    } else if (selected) {
      updateMutation.mutate({
        id: selected.id,
        categoryName: values.categoryName,
        parentId: typeof values.parentId === 'string' ? parseInt(values.parentId) : values.parentId,
        description: values.description,
      }, { onSuccess: () => setModalOpen(false) });
    }
  };

  const columnsAll: TableColumnsType<Category> = [
    {
      title: "Mã",
      dataIndex: "categoryCode",
      key: "categoryCode",
      width: 140,
    },
    {
      title: "Tên",
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
        return (
          <TableActions
            onView={() => handleView(record)}
            onEdit={() => handleEdit(record)}
            onDelete={() => handleDelete(record.id)}
            canEdit={can("products.categories", "edit")}
            canDelete={can("products.categories", "delete")}
          />
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
        isRefetching={isFetching}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["categories"],
          buttonEnds: [
            {
              can: can("products.categories", "create"),
              type: "primary",
              name: "Thêm",
              onClick: handleCreate,
              icon: <PlusOutlined />,
            },
            {
              can: can("products.categories", "create"),

              type: "default",
              name: "Xuất Excel",
              onClick: () => {},
              icon: <DownloadOutlined />,
            },
            {
              can: can("products.categories", "create"),

              type: "default",
              name: "Nhập Excel",
              onClick: () => {},
              icon: <UploadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm kiếm danh mục",
            filterKeys: ["categoryName", "categoryCode", "description"],
          },
          filters: {
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
          categories={categoriesData}
          excludeId={selected?.id}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </>
  );
}
