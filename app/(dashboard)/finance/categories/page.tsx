"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  App,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Statistic,
  Tag,
} from "antd";
import { useEffect, useState } from "react";

interface FinancialCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  type: "THU" | "CHI";
  description: string;
  isActive: boolean;
  createdAt: string;
}

interface CategoryFormValues {
  categoryCode: string;
  categoryName: string;
  type: "THU" | "CHI";
  description?: string;
}
export default function FinancialCategoriesPage() {
  const { message, modal } = App.useApp();
  const { can } = usePermissions();
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<FinancialCategory | null>(null);
  const { reset, applyFilter, updateQueries, query } = useFilter();

  const [form] = Form.useForm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async ({
      values,
      id,
    }: {
      values: CategoryFormValues;
      id?: number | null;
    }) => {
      const url = id
        ? `/api/finance/categories/${id}`
        : "/api/finance/categories";
      const method = id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success(
        editingCategory ? "Cập nhật thành công!" : "Tạo danh mục thành công!"
      );
      setShowModal(false);
      resetForm();
      fetchCategories();
      try {
        queryClient.invalidateQueries({ queryKey: ["finance", "categories"] });
      } catch {
        // ignore
      }
    },
    onError: (err: unknown) => {
      const error = err as Error;
      message.error(error.message || "Có lỗi xảy ra");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/finance/categories/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Xóa thành công!");
      fetchCategories();
      try {
        queryClient.invalidateQueries({ queryKey: ["finance", "categories"] });
      } catch {
        // ignore
      }
    },
    onError: (err: unknown) => {
      const error = err as Error;
      message.error(error.message || "Có lỗi xảy ra");
    },
  });

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/finance/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const onFinish = (values: {
    categoryCode: string;
    categoryName: string;
    type: "THU" | "CHI";
    description?: string;
  }) => {
    saveMutation.mutate({ values, id: editingCategory?.id ?? undefined });
  };

  const handleEdit = (category: FinancialCategory) => {
    setEditingCategory(category);
    form.setFieldsValue({
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      type: category.type,
      description: category.description,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    modal.confirm({
      title: "Bạn có chắc muốn xóa danh mục này?",
      okText: "Xóa",
      okType: "danger",
      onOk: async () => {
        deleteMutation.mutate(id);
      },
    });
  };

  const resetForm = () => {
    form.resetFields();
    setEditingCategory(null);
  };

  const handleResetAll = () => {
    reset();
  };

  const handleExportExcel = () => {
    exportToXlsx(
      filteredCategories as FinancialCategory[],
      `danh_muc_tai_chinh_${new Date().toISOString()}.xlsx`
    );
  };

  const handleImportExcel = () => {
    message.info("Chức năng nhập Excel đang được phát triển");
  };

  const filteredCategories = applyFilter(categories as FinancialCategory[]);

  const total = filteredCategories.length;
  const totalActive = filteredCategories.filter((c) => c.isActive).length;
  const totalInactive = total - totalActive;

  const columnsAll: TableColumnsType<FinancialCategory> = [
    { title: "Mã", dataIndex: "categoryCode", key: "categoryCode", width: 160 },
    { title: "Danh mục", dataIndex: "categoryName", key: "categoryName" },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (t: "THU" | "CHI") => (
        <Tag color={t === "THU" ? "success" : "error"}>{t}</Tag>
      ),
    },
    { title: "Mô tả", dataIndex: "description", key: "description" },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (v: boolean) => (
        <Tag color={v ? "success" : "default"}>{v ? "Hoạt động" : "Ngừng"}</Tag>
      ),
    },
    {
      title: "Tạo lúc",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (d: string) => new Date(d).toLocaleString("vi-VN"),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 160,
      align: "right",
      render: (_: unknown, record: FinancialCategory) => (
        <TableActions
          onEdit={() => handleEdit(record)}
          onDelete={() => handleDelete(record.id)}
          canEdit={can("finance.categories", "edit")}
          canDelete={can("finance.categories", "delete")}
        />
      ),
    },
  ];

  const { exportToXlsx } = useFileExport<FinancialCategory>(columnsAll);
  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  return (
    <>
      <WrapperContent<FinancialCategory>
        isNotAccessible={!can("finance.categories", "view")}
        isLoading={loading}
        header={{
          refetchDataWithKeys: ["finance", "categories"],
          buttonEnds: [
            {
              can: can("finance.categories", "create"),
              type: "default",
              name: "Đặt lại",
              onClick: handleResetAll,
              icon: <ReloadOutlined />,
            },
            {
              can: can("finance.categories", "create"),

              type: "primary",
              name: "Thêm",
              onClick: () => {
                resetForm();
                setShowModal(true);
              },
              icon: <PlusOutlined />,
            },
            {
              can: can("finance.categories", "create"),

              type: "default",
              name: "Xuất Excel",
              onClick: handleExportExcel,
              icon: <DownloadOutlined />,
            },
            {
              type: "default",
              name: "Nhập Excel",
              onClick: handleImportExcel,
              icon: <UploadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm theo mã, tên danh mục...",
            filterKeys: ["categoryCode", "categoryName"],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "type",
                label: "Loại",
                options: [
                  { label: "Thu", value: "THU" },
                  { label: "Chi", value: "CHI" },
                ],
              },
              {
                type: "select",
                name: "isActive",
                label: "Trạng thái",
                options: [
                  { label: "Hoạt động", value: "true" },
                  { label: "Ngừng", value: "false" },
                ],
              },
            ],
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
        <div className="space-y-6">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8} md={6}>
              <Card>
                <Statistic title="Tổng danh mục" value={total} />
              </Card>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Card>
                <Statistic title="Hoạt động" value={totalActive} />
              </Card>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Card>
                <Statistic title="Ngừng" value={totalInactive} />
              </Card>
            </Col>
          </Row>

          <CommonTable
            columns={getVisibleColumns()}
            dataSource={filteredCategories}
            loading={loading}
            paging
          />
        </div>
      </WrapperContent>

      {/* Modal */}
      <Modal
        open={showModal}
        onCancel={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingCategory ? "Sửa danh mục" : "Thêm danh mục"}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ type: "THU" }}
        >
          <Form.Item
            name="categoryCode"
            label="Mã danh mục"
            rules={[{ required: true, message: "Vui lòng nhập mã danh mục" }]}
          >
            <Input disabled={!!editingCategory} />
          </Form.Item>

          <Form.Item
            name="categoryName"
            label="Tên danh mục"
            rules={[{ required: true, message: "Vui lòng nhập tên danh mục" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="THU">Thu</Select.Option>
              <Select.Option value="CHI">Chi</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
