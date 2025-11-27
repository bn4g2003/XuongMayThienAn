import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const createPurchaseOrderSchema = z.object({
  supplierId: z.number().int().positive(),
  orderDate: z.string().min(1),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    materialId: z.number().int().positive(),
    itemCode: z.string().optional(),
    itemName: z.string().min(1),
    unit: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    notes: z.string().optional(),
  })).min(1, 'Đơn đặt hàng phải có ít nhất 1 nguyên liệu'),
});

const purchaseOrdersRouter = router({
  getAll: protectedProcedure
    .query(async () => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.orders', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem đơn đặt hàng');
      }

      const purchaseOrders = await db.purchase_orders.findMany({
        where: {
          branch_id: currentUser?.branchId
        },
        include: {
          suppliers: { select: { supplier_name: true } },
          users: { select: { full_name: true } }
        },
        orderBy: { created_at: 'desc' }
      });

      const formattedResult = purchaseOrders.map(po => ({
        id: po.id,
        poCode: po.po_code,
        supplierName: po.suppliers?.supplier_name,
        orderDate: po.order_date,
        expectedDate: po.expected_date,
        totalAmount: po.total_amount,
        status: po.status,
        createdBy: po.users?.full_name,
        createdAt: po.created_at
      }));

      return formattedResult;
    }),

  create: protectedProcedure
    .input(createPurchaseOrderSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.orders', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo đơn đặt hàng');
      }

      const { supplierId, orderDate, expectedDate, notes, items } = input;

      const totalAmount = items.reduce((sum, item) =>
        sum + (item.quantity * item.unitPrice), 0
      );

      // Tạo mã đơn
      const today = new Date();
      const dateStr = today.getFullYear().toString().slice(-2) +
                     (today.getMonth() + 1).toString().padStart(2, '0') +
                     today.getDate().toString().padStart(2, '0');

      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const count = await db.purchase_orders.count({
        where: {
          created_at: {
            gte: todayStart,
            lt: todayEnd
          }
        }
      });

      const poCode = `PO${dateStr}${String(count + 1).padStart(4, '0')}`;

      try {
        // Tạo đơn đặt hàng
        const createdPO = await db.purchase_orders.create({
          data: {
            po_code: poCode,
            supplier_id: supplierId,
            branch_id: currentUser?.branchId,
            order_date: new Date(orderDate),
            expected_date: expectedDate ? new Date(expectedDate) : null,
            total_amount: totalAmount,
            notes: notes || null,
            created_by: currentUser?.id
          },
          select: { id: true }
        });

        const poId = createdPO.id;

        // Thêm chi tiết
        for (const item of items) {
          await db.purchase_order_details.create({
            data: {
              purchase_order_id: poId,
              material_id: item.materialId,
              item_code: item.itemCode || null,
              item_name: item.itemName,
              unit: item.unit,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total_amount: item.quantity * item.unitPrice,
              notes: item.notes || null
            }
          });
        }

        return {
          id: poId,
          poCode,
          message: 'Tạo đơn đặt hàng thành công'
        };
      } catch (err: unknown) {
        console.error('Create purchase order error:', err);
        throw new Error('Lỗi server khi tạo đơn đặt hàng');
      }
    }),
});

export default purchaseOrdersRouter;