import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const getCategoriesSchema = z.object({
  type: z.enum(['THU', 'CHI']).optional(),
  isActive: z.boolean().optional(),
});

const createCategorySchema = z.object({
  categoryCode: z.string().min(1),
  categoryName: z.string().min(1),
  type: z.enum(['THU', 'CHI']),
  description: z.string().optional(),
});

const updateCategorySchema = z.object({
  id: z.number().int().positive(),
  categoryName: z.string().min(1).optional(),
  type: z.enum(['THU', 'CHI']).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const deleteCategorySchema = z.object({
  id: z.number().int().positive(),
});

const categoriesRouter = router({
  getAll: protectedProcedure
    .input(getCategoriesSchema)
    .query(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('finance.categories', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem danh mục tài chính');
      }

      const { type, isActive } = input;

      const whereClause: {
        type?: string;
        is_active?: boolean;
      } = {};

      if (type) {
        whereClause.type = type;
      }

      if (isActive !== undefined) {
        whereClause.is_active = isActive;
      }

      const categories = await db.financial_categories.findMany({
        where: whereClause,
        select: {
          id: true,
          category_code: true,
          category_name: true,
          type: true,
          description: true,
          is_active: true,
          created_at: true,
        },
        orderBy: [
          { type: 'asc' },
          { category_name: 'asc' },
        ],
      });

      return categories.map((category) => ({
        id: category.id,
        categoryCode: category.category_code,
        categoryName: category.category_name,
        type: category.type,
        description: category.description,
        isActive: category.is_active,
        createdAt: category.created_at,
      }));
    }),

  create: protectedProcedure
    .input(createCategorySchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('finance.categories', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo danh mục tài chính');
      }

      const { categoryCode, categoryName, type, description } = input;

      try {
        const newCategory = await db.financial_categories.create({
          data: {
            category_code: categoryCode,
            category_name: categoryName,
            type,
            description,
          },
          select: {
            id: true,
            category_code: true,
            category_name: true,
            type: true,
            description: true,
            is_active: true,
            created_at: true,
          },
        });

        return {
          id: newCategory.id,
          categoryCode: newCategory.category_code,
          categoryName: newCategory.category_name,
          type: newCategory.type,
          description: newCategory.description,
          isActive: newCategory.is_active,
          createdAt: newCategory.created_at,
        };
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code === 'P2002') {
          throw new Error('Mã danh mục đã tồn tại');
        }
        console.error('Create financial category error:', err);
        throw new Error('Lỗi server khi tạo danh mục tài chính');
      }
    }),

  update: protectedProcedure
    .input(updateCategorySchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('finance.categories', 'edit');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền chỉnh sửa danh mục tài chính');
      }

      const { id, categoryName, type, description, isActive } = input;

      try {
        const updatedCategory = await db.financial_categories.update({
          where: { id },
          data: {
            ...(categoryName !== undefined && { category_name: categoryName }),
            ...(type !== undefined && { type }),
            ...(description !== undefined && { description }),
            ...(isActive !== undefined && { is_active: isActive }),
          },
          select: {
            id: true,
            category_code: true,
            category_name: true,
            type: true,
            description: true,
            is_active: true,
            created_at: true,
          },
        });

        return {
          id: updatedCategory.id,
          categoryCode: updatedCategory.category_code,
          categoryName: updatedCategory.category_name,
          type: updatedCategory.type,
          description: updatedCategory.description,
          isActive: updatedCategory.is_active,
          createdAt: updatedCategory.created_at,
        };
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code === 'P2025') {
          throw new Error('Không tìm thấy danh mục');
        }
        console.error('Update financial category error:', err);
        throw new Error('Lỗi server khi cập nhật danh mục tài chính');
      }
    }),

  delete: protectedProcedure
    .input(deleteCategorySchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('finance.categories', 'delete');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xóa danh mục tài chính');
      }

      try {
        await db.financial_categories.delete({
          where: { id: input.id },
        });

        return {
          message: 'Xóa danh mục thành công',
        };
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code === 'P2025') {
          throw new Error('Không tìm thấy danh mục');
        }
        console.error('Delete financial category error:', err);
        throw new Error('Lỗi server khi xóa danh mục tài chính');
      }
    }),
});

export default categoriesRouter;
