import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const createMaterialSchema = z.object({
  materialCode: z.string().min(1),
  materialName: z.string().min(1),
  unit: z.string().min(1),
  description: z.string().optional(),
});

const updateMaterialSchema = z.object({
  id: z.number().int().positive(),
  materialName: z.string().min(1),
  unit: z.string().min(1),
  description: z.string().optional(),
});

const deleteMaterialSchema = z.object({
  id: z.number().int().positive(),
});

const materialsRouter = router({
  getAll: protectedProcedure
    .query(async () => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('products.materials', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem nguyên vật liệu');
      }

      // Data segregation
      const where: { branch_id?: number } = {};
      if (currentUser?.roleCode !== 'ADMIN' && currentUser?.branchId) {
        where.branch_id = currentUser.branchId;
      }

      const result = await db.materials.findMany({
        where,
        include: {
          branches: true
        },
        orderBy: { id: 'desc' }
      });

      const formattedResult = result.map(material => ({
        id: material.id,
        materialCode: material.material_code,
        materialName: material.material_name,
        unit: material.unit,
        description: material.description,
        branchId: material.branch_id,
        branchName: material.branches?.branch_name
      }));

      return formattedResult;
    }),

  create: protectedProcedure
    .input(createMaterialSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('products.materials', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo nguyên vật liệu');
      }

      const { materialCode, materialName, unit, description } = input;

      try {
        const result = await db.materials.create({
          data: {
            material_code: materialCode,
            material_name: materialName,
            unit: unit,
            description: description,
            branch_id: currentUser?.branchId
          },
          select: {
            id: true,
            material_code: true,
            material_name: true
          }
        });

        return {
          id: result.id,
          materialCode: result.material_code,
          materialName: result.material_name,
          message: 'Tạo nguyên vật liệu thành công'
        };
      } catch (err: unknown) {
        console.error('Create material error:', err);
        const error = err as { code?: string };
        if (error.code === 'P2002') {
          throw new Error('Mã NVL đã tồn tại');
        }
        throw new Error('Lỗi server');
      }
    }),

  update: protectedProcedure
    .input(updateMaterialSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('products.materials', 'edit');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền chỉnh sửa nguyên vật liệu');
      }

      const { id, materialName, unit, description } = input;

      try {
        const result = await db.materials.update({
          where: { id },
          data: {
            material_name: materialName,
            unit: unit,
            description: description
          },
          select: {
            id: true,
            material_code: true,
            material_name: true
          }
        });

        return {
          id: result.id,
          materialCode: result.material_code,
          materialName: result.material_name,
          message: 'Cập nhật nguyên vật liệu thành công'
        };
      } catch (err: unknown) {
        console.error('Update material error:', err);
        throw new Error('Lỗi server');
      }
    }),

  delete: protectedProcedure
    .input(deleteMaterialSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('products.materials', 'delete');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xóa nguyên vật liệu');
      }

      const { id } = input;

      try {
        await db.materials.delete({
          where: { id }
        });

        return { message: 'Xóa nguyên vật liệu thành công' };
      } catch (err: unknown) {
        console.error('Delete material error:', err);
        throw new Error('Lỗi server');
      }
    }),
});

export default materialsRouter;