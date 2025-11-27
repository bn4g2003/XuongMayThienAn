"use client";

import { useProductBOM } from "@/hooks/useProductQuery";
import type { BOMItem, Product } from "@/services/productService";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { Button, Descriptions, Drawer, Space, Tag } from "antd";

type Props = {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onEdit: (p: Product) => void;
  onDelete: (id: number) => void;
  canEdit?: boolean;
  canDelete?: boolean;
};

export default function ProductDetailDrawer({
  open,
  product,
  onClose,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: Props) {
  const bomQuery = useProductBOM(product?.id || 0);

  return (
    <Drawer
      title="Chi tiết sản phẩm"
      placement="right"
      size={600}
      onClose={onClose}
      open={open}
    >
      {product && (
        <>
          <Descriptions column={1} bordered>
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
                ? `${formatCurrency(product.costPrice)} đ`
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

          <div className="mt-4">
            <h4 className="mb-2">Định mức nguyên liệu (BOM)</h4>
            {bomQuery.isLoading ? (
              <p>Đang tải...</p>
            ) : bomQuery.data && bomQuery.data.length > 0 ? (
              <div className="space-y-2">
                {bomQuery.data.map((b: BOMItem) => (
                  <div key={b.id} className="p-2 border rounded">
                    <div className="font-medium">
                      {b.materialName || b.materialCode}
                    </div>
                    <div className="text-sm text-gray-600">
                      Số lượng: {b.quantity} {b.unit}
                    </div>
                    {b.notes && (
                      <div className="text-sm">Ghi chú: {b.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p>Chưa có định mức nguyên liệu</p>
            )}
          </div>

          <Space style={{ marginTop: 16 }}>
            {canEdit && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => onEdit(product)}
              >
                Sửa
              </Button>
            )}
            {canDelete && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(product.id)}
              >
                Xóa
              </Button>
            )}
          </Space>
        </>
      )}
    </Drawer>
  );
}
