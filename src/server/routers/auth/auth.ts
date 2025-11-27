import { generateToken, removeAuthCookie, setAuthCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { getUserPermissions } from '@/lib/permissions';
import { protectedProcedure, publicProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { z } from 'zod';

// Define input schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

const authRouter = router({
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      const { username, password } = input;

      // Tìm user (tạm thời không mã hóa password)
      const user = await db.users.findFirst({
        where: {
          username: username,
          is_active: true
        },
        include: {
          roles: {
            select: {
              role_code: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('Tên đăng nhập không tồn tại');
      }

      // Kiểm tra password (tạm thời so sánh trực tiếp)
      if (user.password_hash !== password) {
        throw new Error('Mật khẩu không đúng');
      }

      // Tạo token
      const token = generateToken({
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        branchId: user.branch_id || 0,
        roleId: user.role_id || 0,
        roleCode: user.roles?.role_code || '',
      });

      // Set cookie
      await setAuthCookie(token);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            branchId: user.branch_id,
            roleCode: user.roles?.role_code || '',
          }
        },
        message: 'Đăng nhập thành công'
      };
    }),

  logout: protectedProcedure
    .mutation(async () => {
      await removeAuthCookie();

      return {
        success: true,
        message: 'Đăng xuất thành công'
      };
    }),

  me: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        success: true,
        data: { user: ctx.session }
      };
    }),

  permissions: protectedProcedure
    .query(async ({ ctx }) => {
      const user = ctx.session;

      // ADMIN có toàn quyền - trả về tất cả permissions với full quyền
      if (user.roleCode === 'ADMIN') {
        return {
          success: true,
          data: {
            isAdmin: true,
            permissions: [] // Frontend sẽ hiểu ADMIN có toàn quyền
          }
        };
      }

      const permissions = await getUserPermissions(user.roleId);

      console.log(`[Auth Permissions] User: ${user.username}, Role: ${user.roleCode}, RoleID: ${user.roleId}`);
      console.log(`[Auth Permissions] Loaded ${permissions.length} permissions:`, permissions.map(p => p.permissionCode));

      return {
        success: true,
        data: {
          isAdmin: false,
          permissions
        }
      };
    }),
});

export default authRouter;
