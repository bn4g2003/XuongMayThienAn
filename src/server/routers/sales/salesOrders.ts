import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const createSalesOrderSchema = z.object({
  customerId: z.number().int().positive(),
  orderDate: z.string().min(1),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    costPrice: z.number().optional().default(0),
    notes: z.string().optional(),
  })).min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm'),
  discountAmount: z.number().optional().default(0),
  notes: z.string().optional(),
});

const salesOrdersRouter = router({
  getAll: protectedProcedure
    .query(async () => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('sales.orders', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem đơn hàng');
      }

      const orders = await db.orders.findMany({
        where: { branch_id: currentUser?.branchId },
        include: {
          customers: true,
          users: true
        },
        orderBy: { created_at: 'desc' }
      });

      const result = orders.map(order => ({
        id: order.id,
        orderCode: order.order_code,
        customerName: order.customers?.customer_name,
        orderDate: order.order_date,
        totalAmount: Number(order.total_amount),
        discountAmount: Number(order.discount_amount || 0),
        finalAmount: Number(order.final_amount),
        status: order.status,
        createdBy: order.users?.full_name,
        createdAt: order.created_at
      }));

      return result;
    }),

  create: protectedProcedure
    .input(createSalesOrderSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('sales.orders', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo đơn hàng');
      }

      const { customerId, orderDate, items, discountAmount, notes } = input;

      // Tính tổng tiền
      const totalAmount = items.reduce((sum, item) =>
        sum + (item.quantity * item.unitPrice), 0
      );
      const finalAmount = totalAmount - (discountAmount || 0);

      // Tạo mã đơn hàng
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const orderCount = await db.orders.count({
        where: { created_at: { gte: startOfDay, lt: endOfDay } }
      });

      const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
      const orderCode = `DH${dateStr}${String(orderCount + 1).padStart(4, '0')}`;

      try {
        // Tạo đơn hàng
        const newOrder = await db.orders.create({
          data: {
            order_code: orderCode,
            customer_id: customerId,
            branch_id: currentUser?.branchId,
            order_date: new Date(orderDate),
            total_amount: totalAmount,
            discount_amount: discountAmount || 0,
            final_amount: finalAmount,
            notes: notes || null,
            created_by: currentUser?.id
          }
        });

        const orderId = newOrder.id;

        // Thêm chi tiết đơn hàng
        const detailsData = items.map((item) => ({
          order_id: orderId,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          cost_price: item.costPrice || 0,
          total_amount: item.quantity * item.unitPrice,
          notes: item.notes || null
        }));

        await db.order_details.createMany({
          data: detailsData
        });

        return {
          id: orderId,
          orderCode,
          message: 'Tạo đơn hàng thành công'
        };
      } catch (err: unknown) {
        console.error('Create sales order error:', err);
        throw new Error('Lỗi server khi tạo đơn hàng');
      }
    }),
});

export default salesOrdersRouter;