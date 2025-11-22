"use client";

import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useUser, useDeleteUser } from "@/hooks/useUserQuery";
import WrapperContent from "@/components/WrapperContent";
import { Descriptions, Tag, Typography, Modal } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
} from "@ant-design/icons";

const { Title } = Typography;

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { can } = usePermissions();

  const userId = Number(params.id);
  const { data: user, isLoading } = useUser(userId);
  const deleteMutation = useDeleteUser();
  console.log(user, "sdfsdf");

  const handleDelete = () => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa người dùng này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => {
        deleteMutation.mutate(userId, {
          onSuccess: () => {
            router.push("/admin/users");
          },
        });
      },
    });
  };

  return (
    <WrapperContent
      title="Chi tiết người dùng"
      isNotAccessible={!can("admin.users", "view")}
      isLoading={isLoading || deleteMutation.isPending}
      isEmpty={!user}
      header={{
        isBackButton: true,
        buttonEnds: [
          ...(can("admin.users", "edit")
            ? [
                {
                  type: "default" as const,
                  name: "Chỉnh sửa",
                  onClick: () => router.push(`/admin/users/${params.id}/edit`),
                  icon: <EditOutlined />,
                },
              ]
            : []),
          ...(can("admin.users", "delete")
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
      {user && (
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Mã người dùng" span={1}>
            {user.userCode}
          </Descriptions.Item>
          <Descriptions.Item label="Tên đăng nhập" span={1}>
            {user.username}
          </Descriptions.Item>
          <Descriptions.Item label="Họ tên" span={2}>
            {user.fullName}
          </Descriptions.Item>
          <Descriptions.Item label="Email" span={1}>
            {user.email || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Số điện thoại" span={1}>
            {user.phone || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Chi nhánh" span={1}>
            {user.branchName}
          </Descriptions.Item>
          <Descriptions.Item label="Vai trò" span={1}>
            {user.roleName}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái" span={1}>
            <Tag
              color={user.isActive ? "success" : "error"}
              icon={user.isActive ? <UnlockOutlined /> : <LockOutlined />}
            >
              {user.isActive ? "Hoạt động" : "Khóa"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo" span={1}>
            {new Date(user.createdAt).toLocaleString("vi-VN")}
          </Descriptions.Item>
        </Descriptions>
      )}
    </WrapperContent>
  );
}
