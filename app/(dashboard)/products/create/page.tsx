"use client";

import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useCreateProduct,
  useCategories,
  useMaterials,
} from "@/hooks/useProductQuery";
import type { CreateProductDto } from "@/services/productService";
import WrapperContent from "@/components/WrapperContent";
import {
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Space,
  InputNumber,
  Card,
} from "antd";
import { SaveOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";

const { Option } = Select;
const { TextArea } = Input;

export default function CreateProductPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const [form] = Form.useForm();

  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();
  const { data: materials = [], isLoading: materialsLoading } = useMaterials();
  const createMutation = useCreateProduct();

  const handleSubmit = (values: CreateProductDto & { bom?: any[] }) => {
    const { bom, ...productData } = values;

    const createData: CreateProductDto = {
      ...productData,
      bom: bom?.map((item) => ({
        materialId: item.materialId,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
      })),
    };

    createMutation.mutate(createData, {
      onSuccess: () => {
        router.push("/products");
      },
    });
  };

  return (
    <WrapperContent
      title="Tạo sản phẩm"
      isNotAccessible={!can("products.products", "create")}
      isLoading={categoriesLoading || materialsLoading}
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
            <Form.Item
              label="Mã sản phẩm"
              name="productCode"
              rules={[{ required: true }]}
            >
              <Input />
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
            parser={(value) => value!.replace(/\$\s?|(,*)/g, "")}
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
                createMutation.isPending ||
                categoriesLoading ||
                materialsLoading
              }
              icon={<SaveOutlined />}
            >
              Tạo sản phẩm
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </WrapperContent>
  );
}
