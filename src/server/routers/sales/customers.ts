import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const createCustomerSchema = z.object({
  customerCode: z.string().min(1),
  customerName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  customerGroupId: z.number().int().positive().optional(),
});

const customersRouter = router({
  getAll: protectedProcedure
    .query(async () => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('sales.customers', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem khách hàng');
      }

      const customers = await db.customers.findMany({
        where: { branch_id: currentUser?.branchId },
        include: { customer_groups: true },
        orderBy: { created_at: 'desc' }
      });

      const result = customers.map(customer => ({
        id: customer.id,
        customerCode: customer.customer_code,
        customerName: customer.customer_name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        customerGroupId: customer.customer_group_id,
        groupName: customer.customer_groups?.group_name || null,
        priceMultiplier: Number(customer.customer_groups?.price_multiplier || 0),
        debtAmount: Number(customer.debt_amount),
        isActive: customer.is_active,
        createdAt: customer.created_at
      }));

      return result;
    }),

  create: protectedProcedure
    .input(createCustomerSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('sales.customers', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo khách hàng');
      }

      const { customerCode, customerName, phone, email, address, customerGroupId } = input;

      // Check if customer code exists
      const existing = await db.customers.findFirst({
        where: { customer_code: customerCode }
      });

      if (existing) {
        throw new Error('Mã khách hàng đã tồn tại');
      }

      try {
        const newCustomer = await db.customers.create({
          data: {
            customer_code: customerCode,
            customer_name: customerName,
            phone: phone || null,
            email: email || null,
            address: address || null,
            customer_group_id: customerGroupId || null,
            branch_id: currentUser?.branchId
          },
          select: { id: true, customer_code: true, customer_name: true }
        });

        return {
          id: newCustomer.id,
          customerCode: newCustomer.customer_code,
          customerName: newCustomer.customer_name,
          message: 'Tạo khách hàng thành công'
        };
      } catch (err: unknown) {
        console.error('Create customer error:', err);
        throw new Error('Lỗi server khi tạo khách hàng');
      }
    }),
});

export default customersRouter;