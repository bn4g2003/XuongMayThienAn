"use client";

import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import useFilter from "@/hooks/useFilter";
import { useUsers, useDeleteUser, USER_KEYS } from "@/hooks/useUserQuery";
import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import { Button, Tag, Modal } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  MoreOutlined,
  EyeOutlined,
  UploadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import useColumn from "@/hooks/useColumn";
import { Dropdown } from "antd";
import type { User } from "@/services/userService";

export default function UsersPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const { updateQuery, reset, applyFilter, updateQueries } = useFilter();

  // React Query hooks
  const { data: users = [], isLoading, isFetching } = useUsers();
  const deleteMutation = useDeleteUser();

  // Apply filter to get filtered users
  const filteredUsers = applyFilter(users);

  const handleView = (user: User) => {
    router.push(`/admin/users/${user.id}`);
  };

  const handleEdit = (user: User) => {
    router.push(`/admin/users/${user.id}/edit`);
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa người dùng này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const columnsAll: TableColumnsType<User> = [
    {
      title: "Mã",
      dataIndex: "userCode",
      key: "userCode",
      width: 120,
    },
    {
      title: "Tên đăng nhập",
      dataIndex: "username",
      key: "username",
      width: 150,
    },
    {
      title: "Họ tên",
      dataIndex: "fullName",
      key: "fullName",
      width: 200,
    },
    {
      title: "Chi nhánh",
      dataIndex: "branchName",
      key: "branchName",
      width: 150,
    },
    {
      title: "Vai trò",
      dataIndex: "roleName",
      key: "roleName",
      width: 150,
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (isActive: boolean) => (
        <Tag
          color={isActive ? "success" : "error"}
          icon={isActive ? <UnlockOutlined /> : <LockOutlined />}
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
      render: (_: unknown, record: User) => {
        const menuItems = [
          {
            key: "view",
            label: "Xem",
            icon: <EyeOutlined />,
            onClick: () => handleView(record),
          },
        ];

        if (can("admin.users", "edit")) {
          menuItems.push({
            key: "edit",
            label: "Sửa",
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          });
        }

        if (can("admin.users", "delete")) {
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

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  return (
    <>
      <WrapperContent
        isNotAccessible={!can("admin.users", "view")}
        isLoading={isLoading || isFetching}
        header={{
          refetchDataWithKeys: USER_KEYS.all,
          buttonEnds: can("admin.users", "create")
            ? [
                {
                  type: "primary",
                  name: "Thêm",
                  onClick: () => router.push("/admin/users/create"),
                  icon: <PlusOutlined />,
                },
                {
                  type: "default",
                  name: "Xuất Excel",
                  onClick: () => {},
                  icon: <DownloadOutlined />,
                },
                {
                  type: "default",
                  name: "Nhập Excel",
                  onClick: () => {},
                  icon: <UploadOutlined />,
                },
              ]
            : undefined,
          searchInput: {
            placeholder: "Tìm kiếm người dùng",
            onChange: (value: string) => updateQuery("search", value),
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "roleCode",
                label: "Vai trò",
                options: [
                  { label: "Quản trị hệ thống", value: "ADMIN" },
                  { label: "Quản lý chi nhánh", value: "STAFF" },
                  { label: "Nhân viên", value: "MANAGER" },
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
          columnSettings: {
            columns: columnsCheck,
            onChange: (cols) => updateColumns(cols),
            onReset: () => {
              resetColumns();
            },
          },
        }}
      >
        <CommonTable
          columns={getVisibleColumns()}
          dataSource={filteredUsers}
          loading={isLoading || deleteMutation.isPending || isFetching}
          paging={true}
          rank={true}
        />
      </WrapperContent>
    </>
  );
}
