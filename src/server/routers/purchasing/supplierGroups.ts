import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const createSupplierGroupSchema = z.object({
  groupCode: z.string().min(1),
  groupName: z.string().min(1),
  description: z.string().optional(),
});

const supplierGroupsRouter = router({
  getAll: protectedProcedure
    .query(async () => {
      // Permission check
      const { hasPermission, error } = await requirePermission('purchasing.suppliers', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem nhóm NCC');
      }

      const supplierGroups = await db.supplier_groups.findMany({
        select: {
          id: true,
          group_code: true,
          group_name: true,
          description: true
        },
        orderBy: {
          group_name: 'asc'
        }
      });

      return supplierGroups.map(group => ({
        id: group.id,
        groupCode: group.group_code,
        groupName: group.group_name,
        description: group.description
      }));
    }),

  create: protectedProcedure
    .input(createSupplierGroupSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('purchasing.suppliers', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo nhóm NCC');
      }

      const { groupCode, groupName, description } = input;

      // Check if group code exists
      const existingGroup = await db.supplier_groups.findFirst({
        where: { group_code: groupCode }
      });

      if (existingGroup) {
        throw new Error('Mã nhóm đã tồn tại');
      }

      try {
        const result = await db.supplier_groups.create({
          data: {
            group_code: groupCode,
            group_name: groupName,
            description: description || null
          },
          select: { id: true, group_code: true, group_name: true }
        });

        return {
          id: result.id,
          groupCode: result.group_code,
          groupName: result.group_name,
          message: 'Tạo nhóm nhà cung cấp thành công'
        };
      } catch (err: unknown) {
        console.error('Create supplier group error:', err);
        throw new Error('Lỗi server khi tạo nhóm nhà cung cấp');
      }
    }),
});

export default supplierGroupsRouter;