"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useUser, useUpdateUser } from "@/hooks/useUserQuery";
import { useRoles, useBranches } from "@/hooks/useCommonQuery";
import type { UpdateUserDto } from "@/services/userService";
import WrapperContent from "@/components/WrapperContent";
import {
  Form,
  Input,
  Select,
  Button,
  Switch,
  Typography,
  Row,
  Col,
  Space,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";

const { Title } = Typography;
const { Option } = Select;

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const { can } = usePermissions();
  const [form] = Form.useForm();

  const userId = Number(params.id);
  const { data: user, isLoading: fetchingUser } = useUser(userId);
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: branches = [], isLoading: branchesLoading } = useBranches();
  const updateMutation = useUpdateUser();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        userCode: user.userCode,
        username: user.username,
        fullName: user.fullName,
        email: user.email || "",
        phone: user.phone || "",
        branchId: user.branchId,
        roleId: user.roleId,
        isActive: user.isActive,
      });
    }
  }, [user, form]);

  const handleSubmit = (values: UpdateUserDto) => {
    updateMutation.mutate(
      { id: userId, data: values },
      {
        onSuccess: () => {
          router.push("/admin/users");
        },
      }
    );
  };

  return (
    <WrapperContent
      title="Chỉnh sửa người dùng"
      isNotAccessible={!can("admin.users", "edit")}
      isEmpty={!user}
      isLoading={fetchingUser || rolesLoading || branchesLoading}
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
            <Form.Item label="Mã người dùng" name="userCode">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Tên đăng nhập" name="username">
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>

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

        <Row gutter={16}>
          <Col span={12}>
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
          </Col>
          <Col span={12}>
            <Form.Item
              label="Trạng thái"
              name="isActive"
              valuePropName="checked"
            >
              <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item className="mb-0 mt-6">
          <Space>
            <Button onClick={() => router.push("/admin/users")}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={
                updateMutation.isPending || rolesLoading || branchesLoading
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
