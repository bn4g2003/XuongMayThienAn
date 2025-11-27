import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const createProductCategorySchema = z.object({
  categoryCode: z.string().min(1),
  categoryName: z.string().min(1),
  parentId: z.number().int().positive().optional(),
  description: z.string().optional(),
});

const updateProductCategorySchema = z.object({
  id: z.number().int().positive(),
  categoryName: z.string().min(1),
  parentId: z.number().int().positive().optional(),
  description: z.string().optional(),
});

const deleteProductCategorySchema = z.object({
  id: z.number().int().positive(),
});

const productCategoriesRouter = router({
  getAll: protectedProcedure
    .query(async () => {
      // Permission check
      const { hasPermission, error } = await requirePermission('products.categories', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem danh mục sản phẩm');
      }

      const categories = await db.product_categories.findMany({
        orderBy: { id: 'asc' }
      });

      // Get parent names separately
      const parentIds = categories
        .map(cat => cat.parent_id)
        .filter(id => id !== null) as number[];

      const parents = parentIds.length > 0
        ? await db.product_categories.findMany({
            where: { id: { in: parentIds } },
            select: { id: true, category_name: true }
          })
        : [];

      const parentMap = new Map(parents.map(p => [p.id, p.category_name]));

      const result = categories.map(category => ({
        id: category.id,
        categoryCode: category.category_code,
        categoryName: category.category_name,
        parentId: category.parent_id,
        description: category.description,
        parentName: category.parent_id ? parentMap.get(category.parent_id) : null
      }));

      return result;
    }),

  create: protectedProcedure
    .input(createProductCategorySchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('products.categories', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo danh mục sản phẩm');
      }

      const { categoryCode, categoryName, parentId, description } = input;

      try {
        const result = await db.product_categories.create({
          data: {
            category_code: categoryCode,
            category_name: categoryName,
            parent_id: parentId || null,
            description: description
          },
          select: {
            id: true,
            category_code: true,
            category_name: true
          }
        });

        return {
          id: result.id,
          categoryCode: result.category_code,
          categoryName: result.category_name,
          message: 'Tạo danh mục sản phẩm thành công'
        };
      } catch (err: unknown) {
        console.error('Create product category error:', err);
        const error = err as { code?: string };
        if (error.code === 'P2002') {
          throw new Error('Mã danh mục đã tồn tại');
        }
        throw new Error('Lỗi server');
      }
    }),

  update: protectedProcedure
    .input(updateProductCategorySchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('products.categories', 'edit');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền chỉnh sửa danh mục sản phẩm');
      }

      const { id, categoryName, parentId, description } = input;

      try {
        const result = await db.product_categories.update({
          where: { id },
          data: {
            category_name: categoryName,
            parent_id: parentId || null,
            description: description
          },
          select: {
            id: true,
            category_code: true,
            category_name: true
          }
        });

        return {
          id: result.id,
          categoryCode: result.category_code,
          categoryName: result.category_name,
          message: 'Cập nhật danh mục sản phẩm thành công'
        };
      } catch (err: unknown) {
        console.error('Update product category error:', err);
        throw new Error('Lỗi server');
      }
    }),

  delete: protectedProcedure
    .input(deleteProductCategorySchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('products.categories', 'delete');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xóa danh mục sản phẩm');
      }

      const { id } = input;

      try {
        await db.product_categories.delete({
          where: { id }
        });

        return { message: 'Xóa danh mục sản phẩm thành công' };
      } catch (err: unknown) {
        console.error('Delete product category error:', err);
        throw new Error('Lỗi server');
      }
    }),
});

export default productCategoriesRouter;