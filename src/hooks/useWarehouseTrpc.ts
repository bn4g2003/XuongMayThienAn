import { trpc } from "@/lib/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const WAREHOUSE_KEYS = {
  all: ["warehouses"],
  lists: () => [...WAREHOUSE_KEYS.all, "list"],
  details: () => [...WAREHOUSE_KEYS.all, "detail"],
  detail: (id: number) => [...WAREHOUSE_KEYS.details(), id],
};

// Hook để fetch tất cả warehouses
export function useWarehouses() {
  return useQuery(trpc.inventory.warehouses.getAll.queryOptions());
}

// Hook để tạo warehouse mới
export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.inventory.warehouses.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.lists() });
    },
  });
}

// Hook để cập nhật warehouse
export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.inventory.warehouses.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.lists() });
    },
  });
}

// Hook để xóa warehouse
export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.inventory.warehouses.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.lists() });
    },
  });
}