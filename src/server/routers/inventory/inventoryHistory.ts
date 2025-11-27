import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const getHistorySchema = z.object({
  warehouseId: z.number().int().positive(),
});

const inventoryHistoryRouter = router({
  getHistory: protectedProcedure
    .input(getHistorySchema)
    .query(async ({ input }) => {
      const { hasPermission, user, error } = await requirePermission('inventory.balance', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem lịch sử');
      }

      const { warehouseId } = input;

      // Lấy tất cả giao dịch liên quan đến kho này
      const where = {
        AND: [
          {
            OR: [
              { from_warehouse_id: warehouseId },
              { to_warehouse_id: warehouseId }
            ]
          },
          ...(user.roleCode !== 'ADMIN' && user.branchId ? [{
            OR: [
              { warehouses_inventory_transactions_from_warehouse_idTowarehouses: { branch_id: user.branchId } },
              { warehouses_inventory_transactions_to_warehouse_idTowarehouses: { branch_id: user.branchId } }
            ]
          }] : [])
        ]
      };

      const transactions = await db.inventory_transactions.findMany({
        where,
        include: {
          warehouses_inventory_transactions_from_warehouse_idTowarehouses: true,
          warehouses_inventory_transactions_to_warehouse_idTowarehouses: true,
          users_inventory_transactions_created_byTousers: true,
          users_inventory_transactions_approved_byTousers: true,
          inventory_transaction_details: {
            select: { total_amount: true }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 100
      });

      const result = transactions.map(trans => ({
        id: trans.id,
        transactionCode: trans.transaction_code,
        transactionType: trans.transaction_type,
        fromWarehouseId: trans.from_warehouse_id,
        fromWarehouseName: trans.warehouses_inventory_transactions_from_warehouse_idTowarehouses?.warehouse_name,
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
});

export default inventoryHistoryRouter;