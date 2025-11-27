import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const getDebtSummarySchema = z.object({
  type: z.enum(['customers', 'suppliers']),
});

const debtSummaryRouter = router({
  getSummary: protectedProcedure
    .input(getDebtSummarySchema)
    .query(async ({ input }) => {
      const { hasPermission, user, error } = await requirePermission('finance.debts', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem tổng hợp công nợ');
      }

      const { type } = input;

      if (type === 'customers') {
        // Lấy danh sách khách hàng với tổng công nợ từ đơn hàng
        const customers = await db.customers.findMany({
          where: { is_active: true },
          include: {
            orders: {
              where: {
                status: { not: 'CANCELLED' },
                ...(user.roleCode !== 'ADMIN' && { branch_id: user.branchId })
              },
              select: {
                id: true,
                final_amount: true,
                paid_amount: true,
                payment_status: true
              }
            }
          }
        });

        // Tính toán tổng hợp cho từng khách hàng
        const result = customers
          .map(customer => {
            const orders = customer.orders;
            const totalOrders = orders.length;
            const totalAmount = orders.reduce((sum, order) => sum + Number(order.final_amount || 0), 0);
            const paidAmount = orders.reduce((sum, order) => sum + Number(order.paid_amount || 0), 0);
            const remainingAmount = totalAmount - paidAmount;
            const unpaidOrders = orders.filter(order => order.payment_status !== 'PAID').length;

            return {
              id: customer.id,
              customerCode: customer.customer_code,
              customerName: customer.customer_name,
              phone: customer.phone,
              email: customer.email,
              address: customer.address,
              totalOrders,
              totalAmount,
              paidAmount,
              remainingAmount,
              unpaidOrders
            };
          })
          .filter(customer => customer.totalOrders > 0)
          .sort((a, b) => b.remainingAmount - a.remainingAmount);

        return result;
      } else if (type === 'suppliers') {
        // Lấy danh sách nhà cung cấp với tổng công nợ từ đơn mua
        const suppliers = await db.suppliers.findMany({
          where: { is_active: true },
          include: {
            purchase_orders: {
              where: {
                status: { not: 'CANCELLED' },
                ...(user.roleCode !== 'ADMIN' && { branch_id: user.branchId })
              },
              select: {
                id: true,
                total_amount: true,
                paid_amount: true,
                payment_status: true
              }
            }
          }
        });

        // Tính toán tổng hợp cho từng nhà cung cấp
        const result = suppliers
          .map(supplier => {
            const orders = supplier.purchase_orders;
            const totalOrders = orders.length;
            const totalAmount = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
            const paidAmount = orders.reduce((sum, order) => sum + Number(order.paid_amount || 0), 0);
            const remainingAmount = totalAmount - paidAmount;
            const unpaidOrders = orders.filter(order => order.payment_status !== 'PAID').length;

            return {
              id: supplier.id,
              supplierCode: supplier.supplier_code,
              supplierName: supplier.supplier_name,
              phone: supplier.phone,
              email: supplier.email,
              address: supplier.address,
              totalOrders,
              totalAmount,
              paidAmount,
              remainingAmount,
              unpaidOrders
            };
          })
          .filter(supplier => supplier.totalOrders > 0)
          .sort((a, b) => b.remainingAmount - a.remainingAmount);

        return result;
      } else {
        throw new Error('Type phải là customers hoặc suppliers');
      }
    }),
});

export default debtSummaryRouter;