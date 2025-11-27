"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import UserDetailDrawer from "@/components/users/UserDetailDrawer";
import UserFormModal, {
  type UserFormValues,
} from "@/components/users/UserFormModal";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useUsers,
  useDeleteUser,
  useCreateUser,
  useUpdateUser,
  useChangePassword,
  USER_KEYS,
} from "@/hooks/useUserTrpc";
import { useRoles } from "@/hooks/useRoleTrpc";
import { useBranches } from "@/hooks/useBranchTrpc";
import type { User } from "@/services/userService";
import {
  DownloadOutlined,
  LockOutlined,
  PlusOutlined,
  UnlockOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { App, Tag } from "antd";
import { useState } from "react";

export default function UsersPage() {
  const { can } = usePermissions();
  const {
    reset,
    applyFilter,
    updateQueries,
    query,
    pagination,
    handlePageChange,
  } = useFilter();

  // React Query hooks
  const { data: usersData, isLoading, isFetching } = useUsers();
  const { data: rolesData = [] } = useRoles();
  const { data: branchesData = [] } = useBranches();

  const roles = rolesData.map(role => ({
    ...role,
    description: role.description || undefined,
  }));

  const branches = branchesData.map(branch => ({
    ...branch,
    address: branch.address || undefined,
    phone: branch.phone || undefined,
    email: branch.email || undefined,
    isActive: branch.isActive ?? true,
    createdAt: branch.createdAt?.toISOString(),
  }));

  const users = usersData?.users.map(user => ({
    ...user,
    email: user.email || undefined,
    phone: user.phone || undefined,
    branchId: user.branchId || 0,
    roleId: user.roleId || 0,
    isActive: user.isActive ?? true,
    createdAt: user.createdAt?.toISOString() || '',
    branchName: user.branchName || '',
    roleName: user.roleName || '',
    roleCode: user.roleCode || '',
  })) || [];
  const deleteMutation = useDeleteUser();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const changePasswordMutation = useChangePassword();

  // Apply filter to get filtered users
  const filteredUsers = applyFilter(users);

  // State for drawer and modal
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const { modal } = App.useApp();
  const handleView = (user: User) => {
    setSelectedUser(user);
    setDrawerVisible(true);
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelectedUser(null);
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setModalMode("edit");
    setSelectedUser(user);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa người dùng này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate({ id }),
    });
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setPasswordModalVisible(true);
  };

  const handlePasswordSubmit = async () => {
    if (!selectedUser) return;

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      modal.error({
        title: "Lỗi",
        content: "Vui lòng nhập đầy đủ thông tin",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      modal.error({
        title: "Lỗi",
        content: "Mật khẩu phải có ít nhất 6 ký tự",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      modal.error({
        title: "Lỗi",
        content: "Mật khẩu xác nhận không khớp",
      });
      return;
    }

    try {
      setPasswordSubmitting(true);
      changePasswordMutation.mutate({
        id: selectedUser.id,
        newPassword: passwordForm.newPassword,
      }, {
        onSuccess: () => {
          setPasswordModalVisible(false);
          setPasswordForm({ newPassword: "", confirmPassword: "" });
        }
      });
    } catch (error) {
      console.error('Password change error:', error);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleModalSubmit = (values: UserFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate(
        values as unknown as Parameters<typeof createMutation.mutate>[0],
        { onSuccess: () => setModalVisible(false) }
      );
    } else if (selectedUser) {
      updateMutation.mutate({
        id: selectedUser.id,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        branchId: values.branchId,
        roleId: values.roleId,
        isActive: !!values.isActive,
      }, {
        onSuccess: () => setModalVisible(false)
      });
    }
  };

  const columnsAll: TableColumnsType<User> = [
    {
      title: "Mã",
      dataIndex: "userCode",
      key: "userCode",
      width: 120,
      fixed: "left",
    },
    {
      title: "Họ tên",
      dataIndex: "fullName",
      key: "fullName",
      width: 200,
    },
    {
      title: "Tên đăng nhập",
      dataIndex: "username",
      key: "username",
      width: 150,
    },
    {
      title: "Chi nhánh",
      dataIndex: "branchName",
      key: "branchName",
      width: 150,
    },
    { title: "Vai trò", dataIndex: "roleName", key: "roleName", width: 150 },
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
      width: 180,
      fixed: "right",
      render: (_: unknown, record: User) => {
        return (
          <TableActions
            onView={() => handleView(record)}
            onEdit={() => handleEdit(record)}
            onDelete={() => handleDelete(record.id)}
            extraActions={[
              {
                title: "Đổi mật khẩu",
                can: can("admin.users", "edit"),
                onClick: () => handleChangePassword(record),
                icon: <LockOutlined />,
              },
            ]}
            canEdit={can("admin.users", "edit")}
            canDelete={can("admin.users", "delete")}
          />
        );
      },
    },
  ];
  const { exportToXlsx } = useFileExport<User>(columnsAll);

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  return (
    <>
      <WrapperContent<User>
        isNotAccessible={!can("admin.users", "view")}
        isRefetching={isFetching}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: USER_KEYS.all,
          buttonEnds: [
            {
              can: can("admin.users", "create"),
              type: "primary",
              name: "Thêm",
              onClick: handleCreate,
              icon: <PlusOutlined />,
            },
            {
              can: can("admin.users", "create"),

              type: "default",
              name: "Xuất Excel",
              onClick: () => {
                exportToXlsx(
                  filteredUsers,
                  `nguoi_dung_${new Date().toISOString()}.xlsx`
                );
              },
              icon: <DownloadOutlined />,
            },
            {
              can: can("admin.users", "create"),
              type: "default",
              name: "Nhập Excel",
              onClick: () => {},
              icon: <UploadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm kiếm người dùng",
            filterKeys: ["fullName", "username", "branchName", "roleName"],
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
              {
                type: "select",
                name: "isActive",
                label: "Trạng thái",
                options: [
                  { label: "Hoạt động", value: true },
                  { label: "Khóa", value: false },
                ],
              },
            ],
            onApplyFilter: (arr) => updateQueries(arr),
            onReset: () => reset(),
            query,
          },
          columnSettings: {
            columns: columnsCheck,
            onChange: (cols) => updateColumns(cols),
            onReset: () => resetColumns(),
          },
        }}
      >
        <CommonTable
          pagination={{
            ...pagination,
            onChange: handlePageChange,
          }}
          columns={getVisibleColumns()}
          dataSource={filteredUsers}
          loading={isLoading || deleteMutation.isPending || isFetching}
          paging
          rank
        />
      </WrapperContent>

      <UserDetailDrawer
        open={drawerVisible}
        user={selectedUser}
        onClose={() => setDrawerVisible(false)}
        onEdit={(u) => {
          setDrawerVisible(false);
          handleEdit(u);
        }}
        onDelete={(id) => {
          setDrawerVisible(false);
          handleDelete(id);
        }}
        canEdit={can("admin.users", "edit")}
        canDelete={can("admin.users", "delete")}
      />

      <UserFormModal
        open={modalVisible}
        mode={modalMode}
        user={selectedUser}
        roles={roles}
        branches={branches}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
      />

      {/* Password Change Modal */}
      {passwordModalVisible && (
        <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <LockOutlined />
                Đổi mật khẩu
              </h2>
              <button
                onClick={() => setPasswordModalVisible(false)}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-gray-700">
                <strong>Người dùng:</strong> {selectedUser?.fullName} (
                {selectedUser?.username})
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  disabled={passwordSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Xác nhận mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  placeholder="Nhập lại mật khẩu mới"
                  disabled={passwordSubmitting}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => setPasswordModalVisible(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                disabled={passwordSubmitting}
              >
                Hủy
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={passwordSubmitting}
              >
                {passwordSubmitting ? "Đang xử lý..." : "Đổi mật khẩu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
