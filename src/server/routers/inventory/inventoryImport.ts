import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const getImportsSchema = z.object({
  status: z.string().optional(),
  warehouseId: z.number().int().positive().optional(),
});

const createImportSchema = z.object({
  toWarehouseId: z.number().int().positive(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().int().positive().optional(),
    materialId: z.number().int().positive().optional(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0).optional().default(0),
    notes: z.string().optional(),
  })).min(1),
});

const inventoryImportRouter = router({
  getAll: protectedProcedure
    .input(getImportsSchema)
    .query(async ({ input }) => {
      const { hasPermission, user, error } = await requirePermission('inventory.import', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem phiếu nhập kho');
      }

      const { status, warehouseId } = input;

      const where = {
        transaction_type: 'NHAP',
        ...(warehouseId && { to_warehouse_id: warehouseId }),
        ...(status && status !== 'ALL' && { status }),
        ...(user.roleCode !== 'ADMIN' && user.branchId && {
          warehouses_inventory_transactions_to_warehouse_idTowarehouses: {
            branch_id: user.branchId
          }
        })
      };

      const transactions = await db.inventory_transactions.findMany({
        where,
        include: {
          warehouses_inventory_transactions_to_warehouse_idTowarehouses: true,
          users_inventory_transactions_created_byTousers: true,
          users_inventory_transactions_approved_byTousers: true,
          inventory_transaction_details: {
            select: { total_amount: true }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      const result = transactions.map(trans => ({
        id: trans.id,
        transactionCode: trans.transaction_code,
        toWarehouseId: trans.to_warehouse_id,
        toWarehouseName: trans.warehouses_inventory_transactions_to_warehouse_idTowarehouses?.warehouse_name,
        status: trans.status,
        notes: trans.notes,
        createdBy: trans.created_by,
        createdByName: trans.users_inventory_transactions_created_byTousers?.full_name,
        createdAt: trans.created_at,
        approvedBy: trans.approved_by,
        approvedByName: trans.users_inventory_transactions_approved_byTousers?.full_name,
        approvedAt: trans.approved_at,
        totalAmount: trans.inventory_transaction_details.reduce((sum, detail) => sum + Number(detail.total_amount || 0), 0)
      }));

      return result;
    }),

  create: protectedProcedure
    .input(createImportSchema)
    .mutation(async ({ input }) => {
      const { hasPermission, user, error } = await requirePermission('inventory.import', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo phiếu nhập kho');
      }

      const { toWarehouseId, notes, items } = input;

      // Kiểm tra quyền truy cập kho
      if (user.roleCode !== 'ADMIN') {
        const warehouse = await db.warehouses.findUnique({
          where: { id: toWarehouseId },
          select: { branch_id: true }
        });
        if (!warehouse || warehouse.branch_id !== user.branchId) {
          throw new Error('Không có quyền nhập vào kho này');
        }
      }

      // Tạo mã phiếu tự động
      const today = new Date();
      const dateStr = today.getFullYear().toString().slice(2) + (today.getMonth() + 1).toString().padStart(2, '0') + today.getDate().toString().padStart(2, '0');
      const prefix = 'PN' + dateStr;

      const lastTrans = await db.inventory_transactions.findFirst({
        where: { transaction_code: { startsWith: prefix } },
        orderBy: { transaction_code: 'desc' },
        select: { transaction_code: true }
      });

      let nextNum = 1;
      if (lastTrans) {
        const lastNumStr = lastTrans.transaction_code.slice(8);
        const lastNum = parseInt(lastNumStr);
        nextNum = lastNum + 1;
      }
      const transactionCode = prefix + nextNum.toString().padStart(4, '0');

      try {
        // Tạo phiếu nhập
        const newTrans = await db.inventory_transactions.create({
          data: {
            transaction_code: transactionCode,
            transaction_type: 'NHAP',
            to_warehouse_id: toWarehouseId,
            status: 'PENDING',
            notes,
            created_by: user.id
          }
        });

        const transactionId = newTrans.id;

        // Thêm chi tiết (chưa cập nhật tồn kho)
        for (const item of items) {
          await db.inventory_transaction_details.create({
            data: {
              transaction_id: transactionId,
              product_id: item.productId || null,
              material_id: item.materialId || null,
              quantity: item.quantity,
              unit_price: item.unitPrice || 0,
              total_amount: item.quantity * (item.unitPrice || 0),
              notes: item.notes || null
            }
          });
        }

        // Phiếu ở trạng thái PENDING - chờ duyệt

        return { id: transactionId, transactionCode };
      } catch (err: unknown) {
        console.error('Create import error:', err);
        throw new Error('Lỗi server khi tạo phiếu nhập kho');
      }
    }),
});

export default inventoryImportRouter;