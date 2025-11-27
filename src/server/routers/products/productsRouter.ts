import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const getProductsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const createProductSchema = z.object({
  productCode: z.string().min(1),
  productName: z.string().min(1),
  categoryId: z.number().int().positive().optional(),
  description: z.string().optional(),
  unit: z.string().min(1),
  costPrice: z.number().optional().default(0),
  bom: z.array(z.object({
    materialId: z.number().int().positive(),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    notes: z.string().optional(),
  })).optional(),
});

const updateProductSchema = z.object({
  id: z.number().int().positive(),
  productCode: z.string().min(1),
  productName: z.string().min(1),
  categoryId: z.number().int().positive().optional(),
  description: z.string().optional(),
  unit: z.string().min(1),
  costPrice: z.number().optional().default(0),
  bom: z.array(z.object({
    materialId: z.number().int().positive(),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    notes: z.string().optional(),
  })).optional(),
});

const deleteProductSchema = z.object({
  id: z.number().int().positive(),
});

const productsRouter = router({
  getAll: protectedProcedure
    .input(getProductsSchema)
    .query(async ({ input }) => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('products.products', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem sản phẩm');
      }

      const { page, limit } = input;
      const offset = (page - 1) * limit;

      // Build where clause: ADMIN sees all, others only their branch
      const whereClause: { branch_id?: number } = {};
      if (currentUser?.roleCode !== 'ADMIN' && currentUser?.branchId) {
        whereClause.branch_id = currentUser.branchId;
      }

      const [productsRaw, total] = await Promise.all([
        db.products.findMany({
          where: whereClause,
          orderBy: { id: 'desc' },
          take: limit,
          skip: offset,
          include: {
            product_categories: { select: { category_name: true } },
            branches: { select: { branch_name: true } },
          },
        }),
        db.products.count({ where: whereClause }),
      ]);

      const products = productsRaw.map((p) => ({
        id: p.id,
        productCode: p.product_code,
        productName: p.product_name,
        categoryId: p.category_id ?? undefined,
        description: p.description ?? undefined,
        unit: p.unit,
        costPrice: p.cost_price !== null && p.cost_price !== undefined ? Number(p.cost_price) : undefined,
        isActive: p.is_active ?? true,
        branchId: p.branch_id ?? undefined,
        categoryName: p.product_categories?.category_name,
        branchName: p.branches?.branch_name,
      }));

      return {
        products,
        total,
        page,
        limit,
      };
    }),

  create: protectedProcedure
    .input(createProductSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('products.products', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo sản phẩm');
      }

      const { productCode, productName, categoryId, description, unit, costPrice, bom } = input;

      try {
        // Insert product
        const created = await db.products.create({
          data: {
            product_code: productCode,
            product_name: productName,
            category_id: categoryId ?? null,
            description: description ?? null,
            unit,
            cost_price: costPrice ?? 0,
            branch_id: currentUser?.branchId ?? undefined,
          },
          select: { id: true, product_code: true, product_name: true },
        });

        const productId = created.id;

        // Insert BOM if provided
        if (bom && bom.length > 0) {
          for (const item of bom) {
            await db.bom.create({
              data: {
                product_id: productId,
                material_id: item.materialId,
                quantity: item.quantity,
                unit: item.unit,
                notes: item.notes ?? null,
              },
            });
          }
        }

        return {
          id: created.id,
          productCode: created.product_code,
          productName: created.product_name,
          message: 'Tạo sản phẩm thành công',
        };
      } catch (err: unknown) {
        console.error('Create product error:', err);
        const error = err as { code?: string };
        if (error.code === '23505' || error.code === 'P2002') {
          throw new Error('Mã sản phẩm đã tồn tại');
        }
        throw new Error('Lỗi server');
      }
    }),

  update: protectedProcedure
    .input(updateProductSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('products.products', 'edit');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền chỉnh sửa sản phẩm');
      }

      const { id, productCode, productName, categoryId, description, unit, costPrice, bom } = input;

      try {
        // Check if product exists
        const existingProduct = await db.products.findUnique({
          where: { id },
        });
        if (!existingProduct) {
          throw new Error('Sản phẩm không tồn tại');
        }

        // Update product
        const updated = await db.products.update({
          where: { id },
          data: {
            product_code: productCode,
            product_name: productName,
            category_id: categoryId ?? null,
            description: description ?? null,
            unit,
            cost_price: costPrice ?? 0,
          },
          select: { id: true, product_code: true, product_name: true },
        });

        // Update BOM if provided
        if (bom !== undefined) {
          // Delete existing BOM
          await db.bom.deleteMany({
            where: { product_id: id },
          });

          // Insert new BOM
          if (bom.length > 0) {
            for (const item of bom) {
              await db.bom.create({
                data: {
                  product_id: id,
                  material_id: item.materialId,
                  quantity: item.quantity,
                  unit: item.unit,
                  notes: item.notes ?? null,
                },
              });
            }
          }
        }

        return {
          id: updated.id,
          productCode: updated.product_code,
          productName: updated.product_name,
          message: 'Cập nhật sản phẩm thành công',
        };
      } catch (err: unknown) {
        console.error('Update product error:', err);
        const error = err as { code?: string; message?: string };
        if (error.code === '23505' || error.code === 'P2002') {
          throw new Error('Mã sản phẩm đã tồn tại');
        }
        throw new Error(error.message || 'Lỗi server');
      }
    }),

  delete: protectedProcedure
    .input(deleteProductSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('products.products', 'delete');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xóa sản phẩm');
      }

      const { id } = input;

      try {
        // Check if product exists
        const existingProduct = await db.products.findUnique({
          where: { id },
        });
        if (!existingProduct) {
          throw new Error('Sản phẩm không tồn tại');
        }

        // Delete BOM first (foreign key constraint)
        await db.bom.deleteMany({
          where: { product_id: id },
        });

        // Delete product
        await db.products.delete({
          where: { id },
        });

        return {
          message: 'Xóa sản phẩm thành công',
        };
      } catch (err: unknown) {
        console.error('Delete product error:', err);
        throw new Error('Lỗi server');
      }
    }),
});

export default productsRouter;