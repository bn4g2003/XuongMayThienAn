"use client";

import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useProduct,
  useDeleteProduct,
  useProductBOM,
} from "@/hooks/useProductQuery";
import WrapperContent from "@/components/WrapperContent";
import { Button, Typography, Descriptions, Tag, Modal, Space } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";

const { Title } = Typography;

function BOMDisplay({ productId }: { productId: number }) {
  const { data: bom = [], isLoading } = useProductBOM(productId);

  if (isLoading) {
    return <div className="text-sm text-gray-500">Đang tải...</div>;
  }

  if (bom.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        Chưa có định mức nguyên liệu
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bom.map((item) => (
        <div key={item.id} className="p-3 rounded-lg border">
          <div className="font-medium text-sm">{item.materialName}</div>
          <div className="text-gray-600 text-xs mt-1">
            Mã NVL: <span className="font-medium">{item.materialCode}</span>
          </div>
          <div className="text-gray-600 text-xs mt-1">
            Số lượng:{" "}
            <span className="font-medium">
              {item.quantity} {item.unit}
            </span>
          </div>
          {item.notes && (
            <div className="text-gray-500 text-xs italic mt-1">
              {item.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { can } = usePermissions();

  const productId = Number(params.id);
  const { data: product, isLoading } = useProduct(productId);
  const deleteMutation = useDeleteProduct();

  const handleEdit = () => {
    router.push(`/products/${productId}/edit`);
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa sản phẩm này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => {
        deleteMutation.mutate(productId, {
          onSuccess: () => {
            router.push("/products");
          },
        });
      },
    });
  };

  return (
    <WrapperContent
      title="Chi tiết sản phẩm"
      isLoading={isLoading}
      isEmpty={!product}
      isNotAccessible={!can("products.products", "view")}
      header={{
        isBackButton: true,
        buttonEnds: [
          ...(can("products.products", "edit")
            ? [
                {
                  type: "default" as const,
                  name: "Chỉnh sửa",
                  onClick: handleEdit,
                  icon: <EditOutlined />,
                },
              ]
            : []),
          ...(can("products.products", "delete")
            ? [
                {
                  type: "default" as const,
                  name: "Xóa",
                  onClick: handleDelete,
                  icon: <DeleteOutlined />,
                  danger: true,
                },
              ]
            : []),
        ],
      }}
    >
      {product && (
        <>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Mã sản phẩm">
              {product.productCode}
            </Descriptions.Item>
            <Descriptions.Item label="Tên sản phẩm">
              {product.productName}
            </Descriptions.Item>
            <Descriptions.Item label="Danh mục">
              {product.categoryName || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Đơn vị">{product.unit}</Descriptions.Item>
            <Descriptions.Item label="Giá vốn">
              {product.costPrice
                ? `${product.costPrice.toLocaleString("vi-VN")}đ`
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Mô tả">
              {product.description || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Chi nhánh">
              {product.branchName}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag
                color={product.isActive ? "success" : "error"}
                icon={
                  product.isActive ? <CheckCircleOutlined /> : <StopOutlined />
                }
              >
                {product.isActive ? "Hoạt động" : "Khóa"}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
          <div className="mt-6">
            <Title level={5}>Định mức nguyên liệu (BOM)</Title>
            <BOMDisplay productId={product.id} />
          </div>
        </>
      )}
    </WrapperContent>
  );
}
