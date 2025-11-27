"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import ProductDetailDrawer from "@/components/products/ProductDetailDrawer";
import ProductFormModal, {
  type ProductFormValues,
} from "@/components/products/ProductFormModal";
import { useBranches } from "@/hooks/useCommonQuery";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
  PRODUCT_KEYS,
  useCategories,
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from "@/hooks/useProductTrpc";
import type {
  CreateProductDto,
  Product,
  UpdateProductDto,
} from "@/services/productService";

// Type for tRPC response
type ProductFromTrpc = {
  id: number;
  productCode: string;
  productName: string;
  categoryId?: number;
  description?: string;
  unit: string;
  costPrice?: number;
  isActive: boolean;
  branchId?: number;
  categoryName?: string;
  branchName?: string;
};
import { formatCurrency } from "@/utils/formatCurrency";
import {
  CheckCircleOutlined,
  DownloadOutlined,
  PlusOutlined,
  StopOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { App, Tag } from "antd";
import { useState } from "react";

export default function ProductsPage() {
  // router not used since we open modals/drawers
  const { can, isAdmin } = usePermissions();
  const { reset, query, applyFilter, updateQueries, pagination, handlePageChange } = useFilter();
  const { data: branches = [] } = useBranches();

  const { data: productsResponse = { products: [], total: 0 }, isLoading, isFetching } = useProducts();
  const products = productsResponse.products;
  const { data: categories = [] } = useCategories();
  const deleteMutation = useDeleteProduct();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const filteredProducts = applyFilter(products);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductFromTrpc | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const { modal } = App.useApp();
  const handleView = (product: ProductFromTrpc) => {
    setSelectedProduct(product);
    setDrawerVisible(true);
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelectedProduct(null);
    setModalVisible(true);
  };

  const handleEdit = (product: ProductFromTrpc) => {
    setModalMode("edit");
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa sản phẩm này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate({ id }),
    });
  };

  const handleModalSubmit = (values: ProductFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate(values as CreateProductDto, {
        onSuccess: () => setModalVisible(false),
      });
    } else if (selectedProduct) {
      updateMutation.mutate(
        { id: selectedProduct.id, ...(values as Omit<CreateProductDto, 'bom'>) },
        { onSuccess: () => setModalVisible(false) }
      );
    }
  };

  const columns: TableColumnsType<any> = [
    {
      title: "Mã",
      dataIndex: "productCode",
      key: "productCode",
      width: 100,
    },
    {
      title: "Tên",
      dataIndex: "productName",
      key: "productName",
      width: 160,
      fixed: "left",
    },
    {
      title: "Chi nhánh",
      dataIndex: "branchName",
      key: "branchName",
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
      render: (value) => (value ? `${formatCurrency(value)} đ` : "-"),
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
      render: (_: unknown, record: ProductFromTrpc) => {
        return (
          <TableActions
            onView={() => handleView(record)}
            onEdit={() => handleEdit(record)}
            onDelete={() => handleDelete(record.id)}
            canEdit={can("products.products", "edit")}
            canDelete={can("products.products", "delete")}
          />
        );
      },
    },
  ];

  return (
    <>
      <WrapperContent<Product>
        isNotAccessible={!can("products.products", "view")}
        isLoading={isLoading || isFetching}
        header={{
          refetchDataWithKeys: PRODUCT_KEYS.all,

          buttonEnds: [
            {
              can: can("products.products", "create"),
              type: "primary",
              name: "Thêm",
              onClick: handleCreate,
              icon: <PlusOutlined />,
            },
            {
              can: can("products.products", "create"),

              type: "default",
              name: "Xuất Excel",
              onClick: () => {},
              icon: <DownloadOutlined />,
            },
            {
              can: can("products.products", "create"),

              type: "default",
              name: "Nhập Excel",
              onClick: () => {},
              icon: <UploadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm kiếm sản phẩm",
            filterKeys: [
              "productCode",
              "productName",
              "categoryName",
              "description",
              "costPrice",
              "unit",
              "branchName",
            ],
          },
          filters: {
            fields: [
              ...(isAdmin
                ? [
                    {
                      type: "select" as const,
                      name: "branchId",
                      label: "Chi nhánh",
                      options: branches.map((branch) => ({
                        label: branch.branchName,
                        value: branch.id.toString(),
                      })),
                    },
                  ]
                : []),
              {
                type: "select",
                name: "categoryId",
                label: "Danh mục",
                options: categories.map((cat: any) => ({
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
            query,
          },
        }}
      >
        <CommonTable
          pagination={{
            ...pagination,
            onChange: handlePageChange,
          }}
          columns={columns}
          dataSource={filteredProducts}
          loading={isLoading || deleteMutation.isPending || isFetching}
          paging={true}
          rank={true}
        />
      </WrapperContent>

      <ProductDetailDrawer
        open={drawerVisible}
        product={selectedProduct as Product | null}
        onClose={() => setDrawerVisible(false)}
        onEdit={(p) => {
          setDrawerVisible(false);
          handleEdit(p as ProductFromTrpc);
        }}
        onDelete={(id) => {
          setDrawerVisible(false);
          handleDelete(id);
        }}
        canEdit={can("products.products", "edit")}
        canDelete={can("products.products", "delete")}
      />

      <ProductFormModal
        open={modalVisible}
        mode={modalMode}
        product={selectedProduct as Product | null}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
      />
    </>
  );
}
