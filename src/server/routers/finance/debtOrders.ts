import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const getDebtOrdersSchema = z.object({
  customerId: z.number().int().positive().optional(),
  supplierId: z.number().int().positive().optional(),
});

const debtOrdersRouter = router({
  getOrders: protectedProcedure
    .input(getDebtOrdersSchema)
    .query(async ({ input }) => {
      const { hasPermission, user, error } = await requirePermission('finance.debts', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem công nợ');
      }

      const { customerId, supplierId } = input;

      if (customerId) {
        // Lấy đơn hàng bán của khách hàng
        const where: Record<string, unknown> = {
          customer_id: customerId,
          status: { not: 'CANCELLED' }
        };

        // Lọc theo chi nhánh
        if (user.roleCode !== 'ADMIN') {
          where.branch_id = user.branchId;
        }

        const orders = await db.orders.findMany({
          where,
          include: {
            customers: true,
            branches: true
          },
          orderBy: [
            { order_date: 'desc' },
            { created_at: 'desc' }
          ]
        });

        const data = orders.map(order => ({
          id: order.id,
          orderCode: order.order_code,
          orderDate: order.order_date,
          totalAmount: order.total_amount,
          discountAmount: order.discount_amount,
          finalAmount: order.final_amount,
          paidAmount: order.paid_amount,
          remainingAmount: Number(order.final_amount) - Number(order.paid_amount || 0),
          paymentStatus: order.payment_status,
          status: order.status,
          notes: order.notes,
          customerName: order.customers?.customer_name,
          customerCode: order.customers?.customer_code,
          branchName: order.branches?.branch_name,
          createdAt: order.created_at
        }));

        return data;
      } else if (supplierId) {
        // Lấy đơn mua của nhà cung cấp
        const where: Record<string, unknown> = {
          supplier_id: supplierId,
          status: { not: 'CANCELLED' }
        };

        // Lọc theo chi nhánh
        if (user.roleCode !== 'ADMIN') {
          where.branch_id = user.branchId;
        }

        const purchaseOrders = await db.purchase_orders.findMany({
          where,
          include: {
            suppliers: true,
            branches: true
          },
          orderBy: [
            { order_date: 'desc' },
            { created_at: 'desc' }
          ]
        });

        const data = purchaseOrders.map(po => ({
          id: po.id,
          orderCode: po.po_code,
          orderDate: po.order_date,
          totalAmount: po.total_amount,
          paidAmount: po.paid_amount,
          remainingAmount: Number(po.total_amount) - Number(po.paid_amount || 0),
          paymentStatus: po.payment_status,
          status: po.status,
          expectedDate: po.expected_date,
          notes: po.notes,
          supplierName: po.suppliers?.supplier_name,
          supplierCode: po.suppliers?.supplier_code,
          branchName: po.branches?.branch_name,
          createdAt: po.created_at
        }));

        return data;
      } else {
        throw new Error('Phải cung cấp customerId hoặc supplierId');
      }
    }),
});

export default debtOrdersRouter;