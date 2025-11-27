
import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const createBranchSchema = z.object({
  branchCode: z.string().min(1),
  branchName: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

const updateBranchSchema = z.object({
  id: z.number().int().positive(),
  branchName: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  isActive: z.boolean(),
});

const deleteBranchSchema = z.object({
  id: z.number().int().positive(),
});

const branchesRouter = router({
  getAll: protectedProcedure
    .query(async () => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.branches', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem chi nhánh');
      }

      const branches = await db.branches.findMany({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          branch_code: true,
          branch_name: true,
          address: true,
          phone: true,
          email: true,
          is_active: true,
          created_at: true,
        },
      });

      return branches.map((b) => ({
        id: b.id,
        branchCode: b.branch_code,
        branchName: b.branch_name,
        address: b.address,
        phone: b.phone,
        email: b.email,
        isActive: b.is_active,
        createdAt: b.created_at,
      }));
    }),

  create: protectedProcedure
    .input(createBranchSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.branches', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo chi nhánh');
      }

      const { branchCode, branchName, address, phone, email } = input;

      try {
        const newBranch = await db.branches.create({
          data: {
            branch_code: branchCode,
            branch_name: branchName,
            address,
            phone,
            email,
            is_active: true,
          },
          select: {
            id: true,
            branch_code: true,
            branch_name: true,
          },
        });

        return {
          id: newBranch.id,
          branchCode: newBranch.branch_code,
          branchName: newBranch.branch_name,
        };
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code === 'P2002') {
          throw new Error('Mã chi nhánh đã tồn tại');
        }
        throw new Error('Lỗi server');
      }
    }),

  update: protectedProcedure
    .input(updateBranchSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.branches', 'edit');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền chỉnh sửa chi nhánh');
      }

      const { id, branchName, address, phone, email, isActive } = input;

      try {
        const updatedBranch = await db.branches.update({
          where: { id },
          data: {
            branch_name: branchName,
            address,
            phone,
            email,
            is_active: isActive,
            updated_at: new Date(),
          },
          select: {
            id: true,
            branch_code: true,
            branch_name: true,
          },
        });

        return {
          id: updatedBranch.id,
          branchCode: updatedBranch.branch_code,
          branchName: updatedBranch.branch_name,
        };
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code === 'P2025') {
          throw new Error('Không tìm thấy chi nhánh');
        }
        throw new Error('Lỗi server');
      }
    }),

  delete: protectedProcedure
    .input(deleteBranchSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.branches', 'delete');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xóa chi nhánh');
      }

      const { id } = input;

      try {
        await db.branches.delete({
          where: { id },
        });

        return { message: 'Xóa chi nhánh thành công' };
      } catch {
        throw new Error('Lỗi server');
      }
    }),
});

export default branchesRouter;
