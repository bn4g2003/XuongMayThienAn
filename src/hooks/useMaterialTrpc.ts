import { trpc } from "@/lib/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const MATERIAL_KEYS = {
  all: ["materials"],
  lists: () => [...MATERIAL_KEYS.all, "list"],
  details: () => [...MATERIAL_KEYS.all, "detail"],
  detail: (id: number) => [...MATERIAL_KEYS.details(), id],
};

// Hook để fetch tất cả materials
export function useMaterials() {
  return useQuery(trpc.products.materials.getAll.queryOptions());
}

// Hook để tạo material mới
export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.products.materials.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_KEYS.lists() });
    },
  });
}

// Hook để cập nhật material
export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.products.materials.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_KEYS.lists() });
    },
  });
}

// Hook để xóa material
export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.products.materials.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_KEYS.lists() });
    },
  });
}