"use client";

import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import useFilter from "@/hooks/useFilter";
import {
  useProducts,
  useDeleteProduct,
  useCreateProduct,
  useUpdateProduct,
  PRODUCT_KEYS,
} from "@/hooks/useProductQuery";
import { useCategories } from "@/hooks/useProductQuery";
import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import ProductDetailDrawer from "@/components/products/ProductDetailDrawer";
import ProductFormModal, {
  type ProductFormValues,
} from "@/components/products/ProductFormModal";
import type {
  CreateProductDto,
  UpdateProductDto,
} from "@/services/productService";
import { Button, Tag, Modal, Dropdown } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import type { Product } from "@/services/productService";

export default function ProductsPage() {
  // router not used since we open modals/drawers
  const { can } = usePermissions();
  const { updateQuery, reset, applyFilter, updateQueries } = useFilter();

  const { data: products = [], isLoading, isFetching } = useProducts();
  const { data: categories = [] } = useCategories();
  const deleteMutation = useDeleteProduct();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const filteredProducts = applyFilter(products);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setDrawerVisible(true);
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelectedProduct(null);
    setModalVisible(true);
  };

  const handleEdit = (product: Product) => {
    setModalMode("edit");
    setSelectedProduct(product);
    setModalVisible(true);
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

  const handleModalSubmit = (values: ProductFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate(values as CreateProductDto, {
        onSuccess: () => setModalVisible(false),
      });
    } else if (selectedProduct) {
      const updatePayload: UpdateProductDto = values as UpdateProductDto;
      updateMutation.mutate(
        { id: selectedProduct.id, data: updatePayload },
        { onSuccess: () => setModalVisible(false) }
      );
    }
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
      render: (_: unknown, record: Product) => {
        const menuItems = [
          {
            key: "view",
            label: "Xem",
            icon: <EyeOutlined />,
            onClick: () => handleView(record),
          },
        ];

        if (can("products.products", "edit")) {
          menuItems.push({
            key: "edit",
            label: "Sửa",
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          });
        }

        if (can("products.products", "delete")) {
          menuItems.push({
            key: "delete",
            label: "Xóa",
            icon: <DeleteOutlined />,
            onClick: () => handleDelete(record.id),
          });
        }

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

  return (
    <>
      <WrapperContent<Product>
        isNotAccessible={!can("products.products", "view")}
        isLoading={isLoading || isFetching}
        header={{
          refetchDataWithKeys: PRODUCT_KEYS.all,
          buttonEnds: can("products.products", "create")
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
            placeholder: "Tìm kiếm sản phẩm",
            filterKeys: [
              "productCode",
              "productName",
              "categoryName",
              "description",
              "costPrice",
            ],
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

      <ProductDetailDrawer
        open={drawerVisible}
        product={selectedProduct}
        onClose={() => setDrawerVisible(false)}
        onEdit={(p) => {
          setDrawerVisible(false);
          handleEdit(p);
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
        product={selectedProduct}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
      />
    </>
  );
}
