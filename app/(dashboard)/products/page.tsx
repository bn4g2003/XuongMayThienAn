"use client";

import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import useFilter from "@/hooks/useFilter";
import {
  useProducts,
  useDeleteProduct,
  PRODUCT_KEYS,
} from "@/hooks/useProductQuery";
import { useCategories } from "@/hooks/useProductQuery";
import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import { Button, Tag, Typography, Modal } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import type { Product } from "@/services/productService";

const { Title } = Typography;

export default function ProductsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const { updateQuery, reset, applyFilter, updateQueries } = useFilter();

  const { data: products = [], isLoading, isFetching } = useProducts();
  const { data: categories = [] } = useCategories();
  const deleteMutation = useDeleteProduct();

  const filteredProducts = applyFilter(products);

  const handleView = (product: Product) => {
    router.push(`/products/${product.id}`);
  };

  const handleEdit = (product: Product) => {
    router.push(`/products/${product.id}/edit`);
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa sản phẩm này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const columns: TableColumnsType<Product> = [
    {
      title: "Mã sản phẩm",
      dataIndex: "productCode",
      key: "productCode",
      width: 120,
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "productName",
      key: "productName",
      width: 200,
    },
    {
      title: "Danh mục",
      dataIndex: "categoryName",
      key: "categoryName",
      width: 150,
      render: (text) => text || "-",
    },
    {
      title: "Đơn vị",
      dataIndex: "unit",
      key: "unit",
      width: 100,
    },
    {
      title: "Giá vốn",
      dataIndex: "costPrice",
      key: "costPrice",
      width: 120,
      render: (value) => (value ? `${value.toLocaleString("vi-VN")}đ` : "-"),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (isActive: boolean) => (
        <Tag
          color={isActive ? "success" : "error"}
          icon={isActive ? <CheckCircleOutlined /> : <StopOutlined />}
        >
          {isActive ? "Hoạt động" : "Khóa"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      fixed: "right",
      render: (_: unknown, record: Product) => (
        <Button.Group>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          />
          {can("products.products", "edit") && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          )}
          {can("products.products", "delete") && (
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          )}
        </Button.Group>
      ),
    },
  ];

  if (!can("products.products", "view")) {
    return (
      <div className="text-center py-12">
        <Title level={3}>Không có quyền truy cập</Title>
        <p className="text-gray-500">
          Bạn không có quyền xem danh sách sản phẩm
        </p>
      </div>
    );
  }

  return (
    <>
      <WrapperContent
        isLoading={isLoading || isFetching}
        header={{
          refetchDataWithKeys: PRODUCT_KEYS.all,
          buttonEnds: can("products.products", "create")
            ? [
                {
                  type: "primary",
                  name: "Thêm",
                  onClick: () => router.push("/products/create"),
                  icon: <PlusOutlined />,
                },
              ]
            : undefined,
          searchInput: {
            placeholder: "Tìm kiếm sản phẩm",
            onChange: (value: string) => updateQuery("search", value),
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "categoryId",
                label: "Danh mục",
                options: categories.map((cat) => ({
                  label: cat.categoryName,
                  value: cat.id.toString(),
                })),
              },
              {
                type: "select",
                name: "isActive",
                label: "Trạng thái",
                options: [
                  { label: "Hoạt động", value: "true" },
                  { label: "Khóa", value: "false" },
                ],
              },
            ],
            onApplyFilter: (arr) => {
              updateQueries(arr);
            },
            onReset: () => {
              reset();
            },
          },
        }}
      >
        <CommonTable
          columns={columns}
          dataSource={filteredProducts}
          loading={isLoading || deleteMutation.isPending || isFetching}
          paging={true}
          rank={true}
        />
      </WrapperContent>
    </>
  );
}
