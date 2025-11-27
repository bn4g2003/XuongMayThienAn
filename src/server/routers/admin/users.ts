import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const getUsersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

const createUserSchema = z.object({
  userCode: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  branchId: z.number().int().positive(),
  roleId: z.number().int().positive(),
});

const updateUserSchema = z.object({
  id: z.number().int().positive(),
  fullName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  branchId: z.number().int().positive(),
  roleId: z.number().int().positive(),
  isActive: z.boolean(),
});

const deleteUserSchema = z.object({
  id: z.number().int().positive(),
});

const getUserByIdSchema = z.object({
  id: z.number().int().positive(),
});

const changePasswordSchema = z.object({
  id: z.number().int().positive(),
  newPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

const usersRouter = router({
  getAll: protectedProcedure
    .input(getUsersSchema)
    .query(async ({ input }) => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('admin.users', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem người dùng');
      }

      const { page, limit } = input;
      const offset = (page - 1) * limit;

      const whereClause: { branch_id?: number } = {};
      if (currentUser?.roleCode !== 'ADMIN') {
        whereClause.branch_id = currentUser?.branchId;
      }

      const [users, total] = await Promise.all([
        db.users.findMany({
          where: whereClause,
          include: {
            branches: { select: { branch_name: true } },
            roles: { select: { role_name: true, role_code: true } },
          },
          orderBy: { id: 'desc' },
          skip: offset,
          take: limit,
        }),
        db.users.count({ where: whereClause }),
      ]);

      const mappedUsers = users.map((u) => ({
        id: u.id,
        userCode: u.user_code,
        username: u.username,
        fullName: u.full_name,
        email: u.email,
        phone: u.phone,
        branchId: u.branch_id,
        roleId: u.role_id,
        isActive: u.is_active,
        createdAt: u.created_at,
        branchName: u.branches?.branch_name,
        roleName: u.roles?.role_name,
        roleCode: u.roles?.role_code,
      }));

      return {
        users: mappedUsers,
        total,
        page,
        limit,
      };
    }),

  create: protectedProcedure
    .input(createUserSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.users', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo người dùng');
      }

      const { userCode, username, password, fullName, email, phone, branchId, roleId } = input;

      // Check if username exists
      const existing = await db.users.findUnique({ where: { username } });
      if (existing) {
        throw new Error('Tên đăng nhập đã tồn tại');
      }

      const newUser = await db.users.create({
        data: {
          user_code: userCode,
          username,
          password_hash: password, // TODO: hash password
          full_name: fullName,
          email,
          phone,
          branch_id: branchId,
          role_id: roleId,
          is_active: true,
        },
        select: {
          id: true,
          user_code: true,
          username: true,
          full_name: true,
        },
      });

      return {
        id: newUser.id,
        userCode: newUser.user_code,
        username: newUser.username,
        fullName: newUser.full_name,
      };
    }),

  update: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.users', 'edit');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền chỉnh sửa người dùng');
      }

      const { id, fullName, email, phone, branchId, roleId, isActive } = input;

      try {
        const updatedUser = await db.users.update({
          where: { id },
          data: {
            full_name: fullName,
            email,
            phone,
            branch_id: branchId,
            role_id: roleId,
            is_active: isActive,
          },
          select: {
            id: true,
            user_code: true,
            username: true,
            full_name: true,
          },
        });

        return {
          id: updatedUser.id,
          userCode: updatedUser.user_code,
          username: updatedUser.username,
          fullName: updatedUser.full_name,
          message: 'Cập nhật thành công',
        };
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code === 'P2025') {
          throw new Error('Không tìm thấy người dùng');
        }
        console.error('Update user error:', err);
        throw new Error('Lỗi server');
      }
    }),

  delete: protectedProcedure
    .input(deleteUserSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.users', 'delete');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xóa người dùng');
      }

      const { id } = input;

      try {
        await db.users.delete({
          where: { id },
        });

        return { message: 'Xóa người dùng thành công' };
      } catch {
        throw new Error('Lỗi server');
      }
    }),

  getById: protectedProcedure
    .input(getUserByIdSchema)
    .query(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.users', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem người dùng');
      }

      const { id } = input;

      const user = await db.users.findUnique({
        where: { id },
        include: {
          branches: { select: { branch_name: true } },
          roles: { select: { role_name: true, role_code: true } },
        },
      });

      if (!user) {
        throw new Error('Không tìm thấy người dùng');
      }

      return {
        id: user.id,
        userCode: user.user_code,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        branchId: user.branch_id,
        roleId: user.role_id,
        isActive: user.is_active,
        createdAt: user.created_at,
        branchName: user.branches?.branch_name,
        roleName: user.roles?.role_name,
        roleCode: user.roles?.role_code,
      };
    }),

  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.users', 'edit');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền đổi mật khẩu');
      }

      const { id, newPassword } = input;

      // Check if user exists
      const existingUser = await db.users.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existingUser) {
        throw new Error('Không tìm thấy người dùng');
      }

      // Update password
      await db.users.update({
        where: { id },
        data: {
          password_hash: newPassword, // TODO: hash password
          updated_at: new Date(),
        },
      });

      return {
        message: 'Đổi mật khẩu thành công',
      };
    }),
});

export default usersRouter;
