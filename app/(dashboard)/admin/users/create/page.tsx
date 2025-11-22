"use client";

import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useCreateUser } from "@/hooks/useUserQuery";
import { useRoles, useBranches } from "@/hooks/useCommonQuery";
import type { CreateUserDto } from "@/services/userService";
import WrapperContent from "@/components/WrapperContent";
import { Form, Input, Select, Button, Typography, Row, Col, Space } from "antd";
import { SaveOutlined } from "@ant-design/icons";

const { Title } = Typography;
const { Option } = Select;

export default function CreateUserPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const [form] = Form.useForm();

  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: branches = [], isLoading: branchesLoading } = useBranches();
  const createMutation = useCreateUser();

  const handleSubmit = (values: CreateUserDto) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        router.push("/admin/users");
      },
    });
  };

  return (
    <WrapperContent
      title="Tạo người dùng"
      isNotAccessible={!can("admin.users", "create")}
      isLoading={rolesLoading || branchesLoading}
      header={{
        isBackButton: true,
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ isActive: true }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Mã người dùng"
              name="userCode"
              rules={[
                { required: true, message: "Vui lòng nhập mã người dùng" },
              ]}
            >
              <Input placeholder="Nhập mã người dùng" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Tên đăng nhập"
              name="username"
              rules={[
                { required: true, message: "Vui lòng nhập tên đăng nhập" },
              ]}
            >
              <Input placeholder="Nhập tên đăng nhập" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
        >
          <Input.Password placeholder="Nhập mật khẩu" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Họ tên"
              name="fullName"
              rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
            >
              <Input placeholder="Nhập họ tên" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ type: "email", message: "Email không hợp lệ" }]}
            >
              <Input placeholder="Nhập email" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Số điện thoại" name="phone">
              <Input placeholder="Nhập số điện thoại" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Chi nhánh"
              name="branchId"
              rules={[{ required: true, message: "Vui lòng chọn chi nhánh" }]}
            >
              <Select placeholder="Chọn chi nhánh">
                {branches.map((branch) => (
                  <Option key={branch.id} value={branch.id}>
                    {branch.branchName}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Vai trò"
          name="roleId"
          rules={[{ required: true, message: "Vui lòng chọn vai trò" }]}
        >
          <Select placeholder="Chọn vai trò">
            {roles.map((role) => (
              <Option key={role.id} value={role.id}>
                {role.roleName}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item className="mb-0 mt-6">
          <Space>
            <Button onClick={() => router.push("/admin/users")}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={
                createMutation.isPending || rolesLoading || branchesLoading
              }
              icon={<SaveOutlined />}
            >
              Tạo người dùng
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </WrapperContent>
  );
}
