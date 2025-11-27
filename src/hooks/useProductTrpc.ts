import { trpc } from "@/lib/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

// Query Keys
export const PRODUCT_KEYS = {
  all: ["products"] as const,
  lists: () => [...PRODUCT_KEYS.all, "list"] as const,
  list: (filters: string) => [...PRODUCT_KEYS.lists(), { filters }] as const,
  details: () => [...PRODUCT_KEYS.all, "detail"] as const,
  detail: (id: number) => [...PRODUCT_KEYS.details(), id] as const,
  bom: (id: number) => [...PRODUCT_KEYS.detail(id), "bom"] as const,
};

export const CATEGORY_KEYS = {
  all: ["categories"] as const,
  lists: () => [...CATEGORY_KEYS.all, "list"] as const,
};

export const MATERIAL_KEYS = {
  all: ["materials"] as const,
  lists: () => [...MATERIAL_KEYS.all, "list"] as const,
};

// Product Hooks
export function useProducts() {
  return useQuery(trpc.products.products.getAll.queryOptions({ page: 1, limit: 1000 }));
}

export function useProduct(id: number) {
  // TODO: Implement getById in productsRouter
  return useQuery({
    queryKey: ["products", "detail", id],
    queryFn: () => ({} as Record<string, unknown>), // Placeholder
    enabled: !!id,
  });
}

export function useProductBOM(id: number) {
  return useQuery({
    queryKey: PRODUCT_KEYS.bom(id),
    queryFn: () => [], // Placeholder - BOM not implemented in tRPC yet
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation(trpc.products.products.create.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      message.success("Tạo sản phẩm thành công");
    },
    onError: (error) => {
      message.error(error?.message || "Tạo sản phẩm thất bại");
    },
  }));
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation(trpc.products.products.update.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      message.success("Cập nhật sản phẩm thành công");
    },
    onError: (error) => {
      message.error(error?.message || "Cập nhật sản phẩm thất bại");
    },
  }));
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation(trpc.products.products.delete.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      message.success("Xóa sản phẩm thành công");
    },
    onError: (error) => {
      message.error(error?.message || "Xóa sản phẩm thất bại");
    },
  }));
}

// Category Hooks - Using service for now, will migrate later
export function useCategories() {
  return useQuery({
    queryKey: CATEGORY_KEYS.lists(),
    queryFn: () => [], // Placeholder - use service for now
  });
}

export function useCategory(id: number) {
  return useQuery({
    queryKey: [...CATEGORY_KEYS.all, "detail", id] as const,
    queryFn: () => ({} as Record<string, unknown>), // Placeholder
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: () => Promise.resolve({}), // Placeholder
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
      message.success("Tạo danh mục thành công");
    },
    onError: (error) => {
      message.error(error?.message || "Tạo danh mục thất bại");
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: () => Promise.resolve({}), // Placeholder
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
      message.success("Cập nhật danh mục thành công");
    },
    onError: (error) => {
      message.error(error?.message || "Cập nhật danh mục thất bại");
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: () => Promise.resolve({}), // Placeholder
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
      message.success("Xóa danh mục thành công");
    },
    onError: (error) => {
      message.error(error?.message || "Xóa danh mục thất bại");
    },
  });
}

// Material Hooks - Using service for now, will migrate later
export function useMaterials() {
  return useQuery({
    queryKey: MATERIAL_KEYS.lists(),
    queryFn: () => [], // Placeholder - use service for now
  });
}

export function useMaterial(id: number) {
  return useQuery({
    queryKey: [...MATERIAL_KEYS.all, "detail", id] as const,
    queryFn: () => ({} as Record<string, unknown>), // Placeholder
    enabled: !!id,
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: () => Promise.resolve({}), // Placeholder
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_KEYS.all });
      message.success("Tạo nguyên liệu thành công");
    },
    onError: (error) => {
      message.error(error?.message || "Tạo nguyên liệu thất bại");
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: () => Promise.resolve({}), // Placeholder
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_KEYS.all });
      message.success("Cập nhật nguyên liệu thành công");
    },
    onError: (error) => {
      message.error(error?.message || "Cập nhật nguyên liệu thất bại");
    },
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: () => Promise.resolve({}), // Placeholder
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_KEYS.all });
      message.success("Xóa nguyên liệu thành công");
    },
    onError: (error) => {
      message.error(error?.message || "Xóa nguyên liệu thất bại");
    },
  });
}