import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const getExportsSchema = z.object({
  status: z.string().optional(),
  warehouseId: z.number().int().positive().optional(),
});

const createExportSchema = z.object({
  fromWarehouseId: z.number().int().positive(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().int().positive().optional(),
    materialId: z.number().int().positive().optional(),
    quantity: z.number().positive(),
    notes: z.string().optional(),
  })).min(1),
});

const inventoryExportRouter = router({
  getAll: protectedProcedure
    .input(getExportsSchema)
    .query(async ({ input }) => {
      const { hasPermission, user, error } = await requirePermission('inventory.export', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem phiếu xuất kho');
      }

      const { status, warehouseId } = input;

      const transactions = await db.inventory_transactions.findMany({
        where: {
          transaction_type: 'XUAT',
          ...(warehouseId && { from_warehouse_id: warehouseId }),
          ...(status && status !== 'ALL' && { status }),
          ...(user.roleCode !== 'ADMIN' && user.branchId && {
            warehouses_inventory_transactions_from_warehouse_idTowarehouses: {
              branch_id: user.branchId
            }
          })
        },
        include: {
          warehouses_inventory_transactions_from_warehouse_idTowarehouses: true,
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
        fromWarehouseId: trans.from_warehouse_id,
        fromWarehouseName: trans.warehouses_inventory_transactions_from_warehouse_idTowarehouses?.warehouse_name,
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
    .input(createExportSchema)
    .mutation(async ({ input }) => {
      const { hasPermission, user, error } = await requirePermission('inventory.export', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo phiếu xuất kho');
      }

      const { fromWarehouseId, notes, items } = input;

      // Tạo mã phiếu
      const today = new Date();
      const dateStr = today.getFullYear().toString().slice(2) + (today.getMonth() + 1).toString().padStart(2, '0') + today.getDate().toString().padStart(2, '0');
      const prefix = 'PX' + dateStr;

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
        let transactionId = 0;

        await db.$transaction(async (tx) => {
          // Tạo phiếu xuất
          const newTrans = await tx.inventory_transactions.create({
            data: {
              transaction_code: transactionCode,
              transaction_type: 'XUAT',
              from_warehouse_id: fromWarehouseId,
              status: 'PENDING',
              notes,
              created_by: user.id
            }
          });

          transactionId = newTrans.id;

          // Kiểm tra tồn kho trước khi tạo phiếu
          for (const item of items) {
            const balance = await tx.inventory_balances.findFirst({
              where: {
                warehouse_id: fromWarehouseId,
                product_id: item.productId || null,
                material_id: item.materialId || null
              },
              select: { quantity: true }
            });

            if (!balance) {
              throw new Error(`Không tìm thấy tồn kho cho mặt hàng này`);
            }

            if (Number(balance.quantity) < item.quantity) {
              throw new Error(`Số lượng tồn kho không đủ`);
            }
          }

          // Thêm chi tiết (chưa trừ tồn kho)
          for (const item of items) {
            await tx.inventory_transaction_details.create({
              data: {
                transaction_id: transactionId,
                product_id: item.productId || null,
                material_id: item.materialId || null,
                quantity: item.quantity,
                notes: item.notes || null
              }
            });
          }
        });

        // Phiếu ở trạng thái PENDING - chờ duyệt

        return { id: transactionId, transactionCode };
      } catch (err: unknown) {
        console.error('Create export error:', err);
        throw new Error('Lỗi server khi tạo phiếu xuất kho');
      }
    }),
});

export default inventoryExportRouter;