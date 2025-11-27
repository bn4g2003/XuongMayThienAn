import { trpc } from "@/lib/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const PRODUCT_CATEGORY_KEYS = {
  all: ["product-categories"],
  lists: () => [...PRODUCT_CATEGORY_KEYS.all, "list"],
  details: () => [...PRODUCT_CATEGORY_KEYS.all, "detail"],
  detail: (id: number) => [...PRODUCT_CATEGORY_KEYS.details(), id],
};

// Hook để fetch tất cả product categories
export function useProductCategories() {
  return useQuery(trpc.products.categories.getAll.queryOptions());
}

// Hook để tạo product category mới
export function useCreateProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.products.categories.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_CATEGORY_KEYS.lists() });
    },
  });
}

// Hook để cập nhật product category
export function useUpdateProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.products.categories.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_CATEGORY_KEYS.lists() });
    },
  });
}

// Hook để xóa product category
export function useDeleteProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.products.categories.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_CATEGORY_KEYS.lists() });
    },
  });
}