import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const createPartnerPaymentSchema = z.object({
  partnerId: z.number().int().positive(),
  paymentAmount: z.number().positive(),
  paymentDate: z.string(),
  paymentMethod: z.string().min(1),
  bankAccountId: z.number().int().positive().optional(),
  partnerType: z.enum(['customer', 'supplier']),
});

const debtPartnersRouter = router({
  createPayment: protectedProcedure
    .input(createPartnerPaymentSchema)
    .mutation(async ({ input }) => {
      const { hasPermission, error } = await requirePermission('finance.debts', 'edit');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền thanh toán công nợ');
      }

      const { partnerId, paymentAmount, bankAccountId, partnerType } = input;

      const amount = paymentAmount;
      const transactionType = partnerType === 'customer' ? 'THU' : 'CHI';

      // Lấy thông tin khách hàng/nhà cung cấp
      let partner: { name: string; code: string } | null = null;
      if (partnerType === 'customer') {
        const customer = await db.customers.findUnique({
          where: { id: partnerId },
          select: {
            customer_name: true,
            customer_code: true
          }
        });
        if (customer) {
          partner = {
            name: customer.customer_name,
            code: customer.customer_code
          };
        }
      } else {
        const supplier = await db.suppliers.findUnique({
          where: { id: partnerId },
          select: {
            supplier_name: true,
            supplier_code: true
          }
        });
        if (supplier) {
          partner = {
            name: supplier.supplier_name,
            code: supplier.supplier_code
          };
        }
      }

      if (!partner) {
        throw new Error(`Không tìm thấy ${partnerType === 'customer' ? 'khách hàng' : 'nhà cung cấp'}`);
      }

      // Lấy danh sách đơn hàng chưa thanh toán đủ (theo thứ tự cũ nhất trước)
      let orders;
      if (partnerType === 'customer') {
        orders = await db.orders.findMany({
          where: {
            customer_id: partnerId,
            status: { not: 'CANCELLED' },
            final_amount: { gt: db.orders.fields.paid_amount }
          },
          select: {
            id: true,
            final_amount: true,
            paid_amount: true
          },
          orderBy: { created_at: 'asc' }
        });
        orders = orders.map(order => ({
          id: order.id,
          amount: Number(order.final_amount),
          paidAmount: Number(order.paid_amount || 0),
          remainingAmount: Number(order.final_amount) - Number(order.paid_amount || 0)
        }));
      } else {
        orders = await db.purchase_orders.findMany({
          where: {
            supplier_id: partnerId,
            status: { not: 'CANCELLED' },
            total_amount: { gt: db.purchase_orders.fields.paid_amount }
          },
          select: {
            id: true,
            total_amount: true,
            paid_amount: true
          },
          orderBy: { created_at: 'asc' }
        });
        orders = orders.map(order => ({
          id: order.id,
          amount: Number(order.total_amount),
          paidAmount: Number(order.paid_amount || 0),
          remainingAmount: Number(order.total_amount) - Number(order.paid_amount || 0)
        }));
      }

      if (orders.length === 0) {
        throw new Error('Không tìm thấy đơn hàng nào cần thanh toán');
      }

      // Phân bổ tiền thanh toán vào các đơn hàng (FIFO - đơn cũ trước)
      let remainingPayment = amount;
      const updatedOrders: Array<{
        orderId: number;
        paymentAmount: number;
        newPaidAmount: number;
        newPaymentStatus: string;
      }> = [];

      try {
        const result = await db.$transaction(async (tx) => {
          for (const order of orders) {
            if (remainingPayment <= 0) break;

            const paymentForThisOrder = Math.min(remainingPayment, order.remainingAmount);
            const newPaidAmount = order.paidAmount + paymentForThisOrder;
            const newRemainingAmount = order.amount - newPaidAmount;

            let newPaymentStatus = 'PARTIAL';
            if (newRemainingAmount === 0) {
              newPaymentStatus = 'PAID';
            } else if (newPaidAmount === 0) {
              newPaymentStatus = 'UNPAID';
            }

            if (partnerType === 'customer') {
              await tx.orders.update({
                where: { id: order.id },
                data: {
                  paid_amount: newPaidAmount,
                  payment_status: newPaymentStatus
                }
              });
            } else {
              await tx.purchase_orders.update({
                where: { id: order.id },
                data: {
                  paid_amount: newPaidAmount,
                  payment_status: newPaymentStatus
                }
              });
            }

            updatedOrders.push({
              orderId: order.id,
              paymentAmount: paymentForThisOrder,
              newPaidAmount,
              newPaymentStatus,
            });

            remainingPayment -= paymentForThisOrder;
          }

          // Cập nhật số dư tài khoản ngân hàng nếu có
          if (bankAccountId) {
            const balanceChange = transactionType === 'THU' ? amount : -amount;
            await tx.bank_accounts.update({
              where: { id: bankAccountId },
              data: {
                balance: {
                  increment: balanceChange
                }
              }
            });
          }

          return updatedOrders;
        });

        return {
          totalPayment: amount,
          ordersUpdated: result.length,
          details: result,
        };
      } catch (err: unknown) {
        console.error('Create partner payment error:', err);
        throw new Error('Lỗi server khi thanh toán');
      }
    }),
});

export default debtPartnersRouter;