"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useProduct,
  useUpdateProduct,
  useCategories,
  useMaterials,
} from "@/hooks/useProductQuery";
import type { UpdateProductDto } from "@/services/productService";
import WrapperContent from "@/components/WrapperContent";
import {
  Form,
  Input,
  Select,
  Button,
  Typography,
  Row,
  Col,
  Space,
  InputNumber,
  Card,
} from "antd";
import { SaveOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";

const { Option } = Select;
const { TextArea } = Input;

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { can } = usePermissions();
  const [form] = Form.useForm();

  const productId = Number(params.id);
  const { data: product, isLoading: fetchingProduct } = useProduct(productId);
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();
  const { data: materials = [], isLoading: materialsLoading } = useMaterials();
  const updateMutation = useUpdateProduct();

  useEffect(() => {
    if (product) {
      form.setFieldsValue({
        productCode: product.productCode,
        productName: product.productName,
        categoryId: product.categoryId,
        description: product.description || "",
        unit: product.unit,
        costPrice: product.costPrice,
        bom: [],
      });
    }
  }, [product, form]);

  const handleSubmit = (values: UpdateProductDto & { bom?: any[] }) => {
    const { bom, ...productData } = values;

    const updateData: UpdateProductDto = {
      ...productData,
      bom: bom?.map((item) => ({
        materialId: item.materialId,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
      })),
    };

    updateMutation.mutate(
      { id: productId, data: updateData },
      {
        onSuccess: () => {
          router.push("/products");
        },
      }
    );
  };

  return (
    <WrapperContent
      title={`Chỉnh sửa sản phẩm: ${product?.productName || ""}`}
      isNotAccessible={!can("products.products", "edit")}
      isEmpty={!product}
      isLoading={fetchingProduct || categoriesLoading || materialsLoading}
      header={{
        isBackButton: true,
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Mã sản phẩm" name="productCode">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Tên sản phẩm"
              name="productName"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Danh mục" name="categoryId">
              <Select allowClear>
                {categories.map((cat) => (
                  <Option key={cat.id} value={cat.id}>
                    {cat.categoryName}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Đơn vị" name="unit" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Giá vốn" name="costPrice">
          <InputNumber
            className="w-full"
            min={0}
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) =>
              // remove any non-numeric characters and return a number; cast to any to satisfy InputNumber's type definition
              Number(String(value ?? "").replace(/\$\s?|(,*)/g, ""))
            }
          />
        </Form.Item>

        <Form.Item label="Mô tả" name="description">
          <TextArea rows={3} />
        </Form.Item>

        <Form.Item label="Định mức nguyên liệu (BOM)">
          <Form.List name="bom">
            {(fields, { add, remove }) => (
              <>
                <Space vertical className="w-full" size="middle">
                  {fields.map(({ key, name, ...restField }) => (
                    <Card
                      key={key}
                      size="small"
                      extra={
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                        />
                      }
                    >
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            {...restField}
                            label="Nguyên vật liệu"
                            name={[name, "materialId"]}
                            rules={[{ required: true }]}
                          >
                            <Select>
                              {materials.map((mat) => (
                                <Option key={mat.id} value={mat.id}>
                                  {mat.materialName} ({mat.unit})
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            label="Số lượng"
                            name={[name, "quantity"]}
                            rules={[{ required: true }]}
                          >
                            <InputNumber
                              className="w-full"
                              min={0}
                              step={0.001}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            label="Đơn vị"
                            name={[name, "unit"]}
                            rules={[{ required: true }]}
                          >
                            <Input />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item
                        {...restField}
                        label="Ghi chú"
                        name={[name, "notes"]}
                      >
                        <Input />
                      </Form.Item>
                    </Card>
                  ))}
                </Space>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                  className="mt-4"
                >
                  Thêm nguyên vật liệu
                </Button>
              </>
            )}
          </Form.List>
        </Form.Item>

        <Form.Item className="mb-0 mt-6">
          <Space>
            <Button onClick={() => router.push("/products")}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={
                updateMutation.isPending ||
                categoriesLoading ||
                materialsLoading
              }
              icon={<SaveOutlined />}
            >
              Cập nhật
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </WrapperContent>
  );
}
