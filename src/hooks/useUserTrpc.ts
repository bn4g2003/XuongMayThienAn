import { trpc } from "@/lib/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, message } from "antd";

export const USER_KEYS = {
  all: ["users"],
  lists: () => [...USER_KEYS.all, "list"],
  list: (filters?: Record<string, unknown>) => [...USER_KEYS.lists(), filters],
  details: () => [...USER_KEYS.all, "detail"],
  detail: (id: number) => [...USER_KEYS.details(), id],
};

// Hook để fetch tất cả users
export function useUsers() {
  return useQuery(trpc.admin.users.getAll.queryOptions({ page: 1, limit: 1000 }));
}

// Hook để fetch user theo ID
export function useUser(id: number) {
  return useQuery(trpc.admin.users.getById.queryOptions({ id }, { enabled: !!id }));
}

// Hook để tạo user mới
export function useCreateUser() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation(trpc.admin.users.create.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.lists() });
      message.success("Tạo người dùng thành công");
    },
    onError: (error) => {
      message.error(error.message || "Lỗi khi tạo người dùng");
    },
  }));
}

// Hook để cập nhật user
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation(trpc.admin.users.update.mutationOptions({
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: USER_KEYS.detail(variables.id) });
      message.success("Cập nhật thành công");
    },
    onError: (error) => {
      message.error(error.message || "Lỗi khi cập nhật người dùng");
    },
  }));
}

// Hook để xóa user
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation(trpc.admin.users.delete.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.lists() });
      message.success("Xóa thành công");
    },
    onError: (error) => {
      message.error(error.message || "Lỗi khi xóa người dùng");
    },
  }));
}

// Hook để đổi mật khẩu
export function useChangePassword() {
  const { message } = App.useApp();

  return useMutation(trpc.admin.users.changePassword.mutationOptions({
    onSuccess: () => {
      message.success("Đổi mật khẩu thành công");
    },
    onError: (error) => {
      message.error(error.message || "Lỗi khi đổi mật khẩu");
    },
  }));
}