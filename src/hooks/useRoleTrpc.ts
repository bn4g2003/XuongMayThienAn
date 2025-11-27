import { trpc } from "@/lib/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, message } from "antd";

export const ROLE_KEYS = {
  all: ["roles"],
  lists: () => [...ROLE_KEYS.all, "list"],
  details: () => [...ROLE_KEYS.all, "detail"],
  detail: (id: number) => [...ROLE_KEYS.details(), id],
};

// Hook để fetch tất cả roles
export function useRoles() {
  return useQuery(trpc.admin.roles.getAll.queryOptions());
}

// Hook để tạo role mới
export function useCreateRole() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation(trpc.admin.roles.create.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLE_KEYS.lists() });
      message.success("Tạo vai trò thành công");
    },
    onError: (error) => {
      message.error(error.message || "Lỗi khi tạo vai trò");
    },
  }));
}

// Hook để cập nhật role
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation(trpc.admin.roles.update.mutationOptions({
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ROLE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ROLE_KEYS.detail(variables.id) });
      message.success("Cập nhật thành công");
    },
    onError: (error) => {
      message.error(error.message || "Lỗi khi cập nhật vai trò");
    },
  }));
}

// Hook để xóa role
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation(trpc.admin.roles.delete.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLE_KEYS.lists() });
      message.success("Xóa thành công");
    },
    onError: (error) => {
      message.error(error.message || "Lỗi khi xóa vai trò");
    },
  }));
}