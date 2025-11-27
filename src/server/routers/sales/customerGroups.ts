import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const createCustomerGroupSchema = z.object({
  groupCode: z.string().min(1),
  groupName: z.string().min(1),
  priceMultiplier: z.number().min(0),
  description: z.string().optional(),
});

const customerGroupsRouter = router({
  getAll: protectedProcedure
    .query(async () => {
      // Permission check
      const { hasPermission, error } = await requirePermission('sales.customers', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem nhóm khách hàng');
      }

      const customerGroups = await db.customer_groups.findMany({
        include: {
          _count: {
            select: { customers: true }
          }
        },
        orderBy: {
          group_name: 'asc'
        }
      });

      // Transform the data to match the expected format
      const formattedResult = customerGroups.map(group => ({
        id: group.id,
        groupCode: group.group_code,
        groupName: group.group_name,
        priceMultiplier: group.price_multiplier,
        description: group.description,
        createdAt: group.created_at,
        customerCount: group._count.customers
      }));

      return formattedResult;
    }),

  create: protectedProcedure
    .input(createCustomerGroupSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('sales.customers', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo nhóm khách hàng');
      }

      const { groupCode, groupName, priceMultiplier, description } = input;

      // Check if group code exists
      const existingGroup = await db.customer_groups.findFirst({
        where: { group_code: groupCode }
      });

      if (existingGroup) {
        throw new Error('Mã nhóm đã tồn tại');
      }

      try {
        const result = await db.customer_groups.create({
          data: {
            group_code: groupCode,
            group_name: groupName,
            price_multiplier: priceMultiplier,
            description: description || null
          },
          select: { id: true, group_code: true, group_name: true }
        });

        return {
          id: result.id,
          groupCode: result.group_code,
          groupName: result.group_name,
          message: 'Tạo nhóm khách hàng thành công'
        };
      } catch (err: unknown) {
        console.error('Create customer group error:', err);
        throw new Error('Lỗi server khi tạo nhóm khách hàng');
      }
    }),
});

export default customerGroupsRouter;