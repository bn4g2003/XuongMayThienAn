import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const createWarehouseSchema = z.object({
  warehouseCode: z.string().min(1),
  warehouseName: z.string().min(1),
  branchId: z.number().int().positive(),
  address: z.string().optional(),
  warehouseType: z.string().min(1),
});

const updateWarehouseSchema = z.object({
  id: z.number().int().positive(),
  warehouseName: z.string().min(1),
  branchId: z.number().int().positive(),
  address: z.string().optional(),
  warehouseType: z.string().min(1),
  isActive: z.boolean(),
});

const deleteWarehouseSchema = z.object({
  id: z.number().int().positive(),
});

const warehousesRouter = router({
  getAll: protectedProcedure
    .query(async () => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('admin.warehouses', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem kho');
      }

      const whereClause: { branch_id?: number } = {};
      if (currentUser?.roleCode !== 'ADMIN') {
        whereClause.branch_id = currentUser?.branchId;
      }

      const warehouses = await db.warehouses.findMany({
        where: whereClause,
        include: {
          branches: { select: { branch_name: true } },
        },
        orderBy: { id: 'asc' },
      });

      return warehouses.map((w) => ({
        id: w.id,
        warehouseCode: w.warehouse_code,
        warehouseName: w.warehouse_name,
        branchId: w.branch_id,
        address: w.address,
        isActive: w.is_active,
        warehouseType: w.warehouse_type,
        branchName: w.branches?.branch_name,
      }));
    }),

  create: protectedProcedure
    .input(createWarehouseSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.warehouses', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo kho');
      }

      const { warehouseCode, warehouseName, branchId, address, warehouseType } = input;

      try {
        const newWarehouse = await db.warehouses.create({
          data: {
            warehouse_code: warehouseCode,
            warehouse_name: warehouseName,
            branch_id: branchId,
            address,
            warehouse_type: warehouseType,
            is_active: true,
          },
          select: {
            id: true,
            warehouse_code: true,
            warehouse_name: true,
            warehouse_type: true,
          },
        });

        return {
          id: newWarehouse.id,
          warehouseCode: newWarehouse.warehouse_code,
          warehouseName: newWarehouse.warehouse_name,
          warehouseType: newWarehouse.warehouse_type,
          message: 'Tạo kho thành công',
        };
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code === 'P2002') {
          throw new Error('Mã kho đã tồn tại');
        }
        console.error('Create warehouse error:', err);
        throw new Error('Lỗi server');
      }
    }),

  update: protectedProcedure
    .input(updateWarehouseSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.warehouses', 'edit');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền chỉnh sửa kho');
      }

      const { id, warehouseName, branchId, address, warehouseType, isActive } = input;

      try {
        const updatedWarehouse = await db.warehouses.update({
          where: { id },
          data: {
            warehouse_name: warehouseName,
            branch_id: branchId,
            address,
            warehouse_type: warehouseType,
            is_active: isActive,
          },
          select: {
            id: true,
            warehouse_code: true,
            warehouse_name: true,
          },
        });

        return {
          id: updatedWarehouse.id,
          warehouseCode: updatedWarehouse.warehouse_code,
          warehouseName: updatedWarehouse.warehouse_name,
          message: 'Cập nhật kho thành công',
        };
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code === 'P2025') {
          throw new Error('Không tìm thấy kho');
        }
        console.error('Update warehouse error:', err);
        throw new Error('Lỗi server');
      }
    }),

  delete: protectedProcedure
    .input(deleteWarehouseSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.warehouses', 'delete');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xóa kho');
      }

      const { id } = input;

      try {
        await db.warehouses.delete({
          where: { id },
        });

        return { message: 'Xóa kho thành công' };
      } catch {
        throw new Error('Lỗi server');
      }
    }),
});

export default warehousesRouter;
