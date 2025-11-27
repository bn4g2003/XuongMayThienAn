import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';
// Define input schemas
const getBankAccountsSchema = z.object({
  branchId: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});


const createBankAccountSchema = z.object({
  accountNumber: z.string().min(1),
  accountHolder: z.string().min(1),
  bankName: z.string().min(1),
  branchName: z.string().optional(),
  balance: z.number().optional().default(0),
  branchId: z.number().int().positive().optional(),
});

const updateBankAccountSchema = z.object({
  id: z.number().int().positive(),
  accountNumber: z.string().min(1),
  accountHolder: z.string().min(1),
  bankName: z.string().min(1),
  branchName: z.string().optional(),
  balance: z.number().optional(),
  isActive: z.boolean(),
  branchId: z.number().int().positive().optional(),
});

const deleteBankAccountSchema = z.object({
  id: z.number().int().positive(),
});

const bankAccountRouter = router({
  getAll: protectedProcedure
    .input(getBankAccountsSchema)
    .query(async ({ input }) => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('finance.cashbooks', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem tài khoản ngân hàng');
      }

      const { branchId, isActive } = input;

      const whereClause: {
        branch_id?: number;
        is_active?: boolean;
      } = {};

      // Filter by branch
      if (currentUser?.roleCode !== 'ADMIN') {
        whereClause.branch_id = currentUser?.branchId;
      } else if (branchId) {
        whereClause.branch_id = branchId;
      }

      if (isActive !== undefined) {
        whereClause.is_active = isActive;
      }

      const bankAccounts = await db.bank_accounts.findMany({
        where: whereClause,
        include: {
          branches: { select: { branch_name: true } },
        },
        orderBy: [
          { bank_name: 'asc' },
          { account_number: 'asc' },
        ],
      });

      return bankAccounts.map((ba) => ({
        id: ba.id,
        accountNumber: ba.account_number,
        accountHolder: ba.account_holder,
        bankName: ba.bank_name,
        branchName: ba.branch_name,
        balance: ba.balance,
        isActive: ba.is_active,
        companyBranchName: ba.branches?.branch_name,
        createdAt: ba.created_at,
      }));
    }),

  create: protectedProcedure
    .input(createBankAccountSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('finance.cashbooks', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo tài khoản ngân hàng');
      }

      const { accountNumber, accountHolder, bankName, branchName, balance, branchId } = input;

      // Determine final branch ID
      const finalBranchId = currentUser?.roleCode === 'ADMIN' ? branchId : currentUser?.branchId;

      if (!finalBranchId) {
        throw new Error('Thiếu thông tin chi nhánh');
      }

      try {
        const newBankAccount = await db.bank_accounts.create({
          data: {
            account_number: accountNumber,
            account_holder: accountHolder,
            bank_name: bankName,
            branch_name: branchName,
            balance,
            branch_id: finalBranchId,
            is_active: true,
          },
          select: {
            id: true,
            account_number: true,
            account_holder: true,
            bank_name: true,
            branch_name: true,
            balance: true,
            is_active: true,
            created_at: true,
          },
        });

        return {
          id: newBankAccount.id,
          accountNumber: newBankAccount.account_number,
          accountHolder: newBankAccount.account_holder,
          bankName: newBankAccount.bank_name,
          branchName: newBankAccount.branch_name,
          balance: newBankAccount.balance,
          isActive: newBankAccount.is_active,
          createdAt: newBankAccount.created_at,
        };
      } catch (err: unknown) {
        console.error('Create bank account error:', err);
        throw new Error('Lỗi server khi tạo tài khoản ngân hàng');
      }
    }),

  update: protectedProcedure
    .input(updateBankAccountSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('finance.cashbooks', 'edit');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền chỉnh sửa tài khoản ngân hàng');
      }

      const { id, accountNumber, accountHolder, bankName, branchName, balance, isActive, branchId } = input;

      // Determine final branch ID
      const finalBranchId = currentUser?.roleCode === 'ADMIN' ? branchId : currentUser?.branchId;

      if (!finalBranchId) {
        throw new Error('Thiếu thông tin chi nhánh');
      }

      try {
        const updatedBankAccount = await db.bank_accounts.update({
          where: { id },
          data: {
            account_number: accountNumber,
            account_holder: accountHolder,
            bank_name: bankName,
            branch_name: branchName,
            balance,
            is_active: isActive,
            branch_id: finalBranchId,
          },
          select: {
            id: true,
            account_number: true,
            account_holder: true,
            bank_name: true,
            branch_name: true,
            balance: true,
            is_active: true,
            created_at: true,
          },
        });

        return {
          id: updatedBankAccount.id,
          accountNumber: updatedBankAccount.account_number,
          accountHolder: updatedBankAccount.account_holder,
          bankName: updatedBankAccount.bank_name,
          branchName: updatedBankAccount.branch_name,
          balance: updatedBankAccount.balance,
          isActive: updatedBankAccount.is_active,
          createdAt: updatedBankAccount.created_at,
        };
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code === 'P2025') {
          throw new Error('Không tìm thấy tài khoản ngân hàng');
        }
        console.error('Update bank account error:', err);
        throw new Error('Lỗi server khi cập nhật tài khoản ngân hàng');
      }
    }),

  delete: protectedProcedure
    .input(deleteBankAccountSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('finance.cashbooks', 'delete');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xóa tài khoản ngân hàng');
      }

      const { id } = input;

      try {
        await db.bank_accounts.delete({
          where: { id },
        });

        return { message: 'Xóa tài khoản ngân hàng thành công' };
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code === 'P2025') {
          throw new Error('Không tìm thấy tài khoản ngân hàng');
        }
        console.error('Delete bank account error:', err);
        throw new Error('Lỗi server khi xóa tài khoản ngân hàng');
      }
    }),
});

export default bankAccountRouter;
