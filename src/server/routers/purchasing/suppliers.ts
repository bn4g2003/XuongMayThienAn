import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const createSupplierSchema = z.object({
  supplierCode: z.string().min(1),
  supplierName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  supplierGroupId: z.number().int().positive().optional(),
});

const suppliersRouter = router({
  getAll: protectedProcedure
    .query(async () => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.suppliers', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem nhà cung cấp');
      }

      const suppliers = await db.suppliers.findMany({
        where: {
          branch_id: currentUser?.branchId
        },
        include: {
          supplier_groups: {
            select: {
              group_name: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      // Transform the data to match the expected format
      const formattedResult = suppliers.map(supplier => ({
        id: supplier.id,
        supplierCode: supplier.supplier_code,
        supplierName: supplier.supplier_name,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        groupName: supplier.supplier_groups?.group_name,
        debtAmount: supplier.debt_amount,
        isActive: supplier.is_active,
        createdAt: supplier.created_at
      }));

      return formattedResult;
    }),

  create: protectedProcedure
    .input(createSupplierSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.suppliers', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo nhà cung cấp');
      }

      const { supplierCode, supplierName, phone, email, address, supplierGroupId } = input;

      // Check if supplier code exists
      const existingSupplier = await db.suppliers.findFirst({
        where: { supplier_code: supplierCode }
      });

      if (existingSupplier) {
        throw new Error('Mã nhà cung cấp đã tồn tại');
      }

      try {
        const result = await db.suppliers.create({
          data: {
            supplier_code: supplierCode,
            supplier_name: supplierName,
            phone: phone || null,
            email: email || null,
            address: address || null,
            supplier_group_id: supplierGroupId || null,
            branch_id: currentUser?.branchId
          },
          select: { id: true, supplier_code: true, supplier_name: true }
        });

        return {
          id: result.id,
          supplierCode: result.supplier_code,
          supplierName: result.supplier_name,
          message: 'Tạo nhà cung cấp thành công'
        };
      } catch (err: unknown) {
        console.error('Create supplier error:', err);
        throw new Error('Lỗi server khi tạo nhà cung cấp');
      }
    }),
});

export default suppliersRouter;