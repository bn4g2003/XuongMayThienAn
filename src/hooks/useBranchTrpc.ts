import { trpc } from "@/lib/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const BRANCH_KEYS = {
  all: ["branches"],
  lists: () => [...BRANCH_KEYS.all, "list"],
  details: () => [...BRANCH_KEYS.all, "detail"],
  detail: (id: number) => [...BRANCH_KEYS.details(), id],
};

// Hook để fetch tất cả branches
export function useBranches() {
  return useQuery(trpc.inventory.branches.getAll.queryOptions());
}

// Hook để tạo branch mới
export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.inventory.branches.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRANCH_KEYS.lists() });
    },
  });
}

// Hook để cập nhật branch
export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.inventory.branches.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRANCH_KEYS.lists() });
    },
  });
}

// Hook để xóa branch
export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.inventory.branches.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRANCH_KEYS.lists() });
    },
  });
}