import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const createRoleSchema = z.object({
  roleCode: z.string().min(1),
  roleName: z.string().min(1),
  description: z.string().optional(),
  level: z.number().int().min(1).max(10).optional().default(3),
});

const updateRoleSchema = z.object({
  id: z.number().int().positive(),
  roleName: z.string().min(1),
  description: z.string().optional(),
  level: z.number().int().min(1).max(10).optional(),
});

const getPermissionsSchema = z.object({
  id: z.number().int().positive(),
});

const updatePermissionsSchema = z.object({
  id: z.number().int().positive(),
  permissions: z.array(z.object({
    id: z.number().int().positive(),
    canView: z.boolean(),
    canCreate: z.boolean(),
    canEdit: z.boolean(),
    canDelete: z.boolean(),
  })),
});

const deleteRoleSchema = z.object({
  id: z.number().int().positive(),
});



const rolesRouter = router({
  getAll: protectedProcedure
    .query(async () => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.roles', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem vai trò');
      }

      const roles = await db.roles.findMany({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          role_code: true,
          role_name: true,
          description: true,
          created_at: true,
        },
      });

      return roles.map((r) => ({
        id: r.id,
        roleCode: r.role_code,
        roleName: r.role_name,
        description: r.description,
        createdAt: r.created_at,
      }));
    }),

  create: protectedProcedure
    .input(createRoleSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.roles', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo vai trò');
      }

      const { roleCode, roleName, description, level } = input;

      try {
        const newRole = await db.roles.create({
          data: {
            role_code: roleCode,
            role_name: roleName,
            description,
          },
          select: {
            id: true,
            role_code: true,
            role_name: true,
          },
        });

        return {
          id: newRole.id,
          roleCode: newRole.role_code,
          roleName: newRole.role_name,
        };
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code === 'P2002') {
          throw new Error('Mã vai trò đã tồn tại');
        }
        throw new Error('Lỗi server');
      }
    }),

  update: protectedProcedure
    .input(updateRoleSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.roles', 'edit');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền chỉnh sửa vai trò');
      }

      const { id, roleName, description, level } = input;

      try {
        const updatedRole = await db.roles.update({
          where: { id },
          data: {
            role_name: roleName,
            description,
          },
          select: {
            id: true,
            role_code: true,
            role_name: true,
          },
        });

        return {
          id: updatedRole.id,
          roleCode: updatedRole.role_code,
          roleName: updatedRole.role_name,
        };
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code === 'P2025') {
          throw new Error('Không tìm thấy vai trò');
        }
        throw new Error('Lỗi server');
      }
    }),

  delete: protectedProcedure
    .input(deleteRoleSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.roles', 'delete');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xóa vai trò');
      }

      const { id } = input;

      try {
        await db.roles.delete({
          where: { id },
        });

        return { message: 'Xóa vai trò thành công' };
      } catch {
        throw new Error('Lỗi server');
      }
    }),
    getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.roles', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem vai trò');
      }

      const { id } = input;

      const role = await db.roles.findUnique({
        where: { id },
        select: {
          id: true,
          role_code: true,
          role_name: true,
          description: true,
          created_at: true,
        },
      });

      if (!role) {
        throw new Error('Không tìm thấy vai trò');
      }


      return {
        id: role.id,
        roleCode: role.role_code,
        roleName: role.role_name,
        description: role.description,
        createdAt: role.created_at,
      };
    }),

  getPermissionsByRoleId: protectedProcedure
    .input(getPermissionsSchema)
    .query(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.roles', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem phân quyền');
      }

      const { id } = input;

      const role = await db.roles.findUnique({
        where: { id },
        select: {
          role_code: true,
          role_name: true,
        },
      });

      if (!role) {
        throw new Error('Không tìm thấy vai trò');
      }

      if (role.role_code === 'ADMIN' || id === 1) {
        // ADMIN has all permissions automatically
        const permissions = await db.permissions.findMany({
          orderBy: [{ module: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            permission_code: true,
            permission_name: true,
            module: true,
            description: true,
          },
        });

        return {
          roleName: role.role_name,
          permissions: permissions.map((p) => ({
            id: p.id,
            permissionCode: p.permission_code,
            permissionName: p.permission_name,
            module: p.module,
            description: p.description,
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
          })),
          isAdmin: true,
          note: 'ADMIN có toàn quyền tự động - không cần lưu vào database',
        };
      } else {
        // Get all permissions with role's permissions
        const permissions = await db.permissions.findMany({
          orderBy: [{ module: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            permission_code: true,
            permission_name: true,
            module: true,
            description: true,
            role_permissions: {
              where: { role_id: id },
              select: {
                can_view: true,
                can_create: true,
                can_edit: true,
                can_delete: true,
              },
            },
          },
        });

        return {
          roleName: role.role_name,
          permissions: permissions.map((p) => {
            const rp = p.role_permissions[0] || {};
            return {
              id: p.id,
              permissionCode: p.permission_code,
              permissionName: p.permission_name,
              module: p.module,
              description: p.description,
              canView: rp.can_view || false,
              canCreate: rp.can_create || false,
              canEdit: rp.can_edit || false,
              canDelete: rp.can_delete || false,
            };
          }),
        };
      }
    }),

  updatePermissions: protectedProcedure
    .input(updatePermissionsSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('admin.roles', 'edit');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền chỉnh sửa phân quyền');
      }

      const { id, permissions } = input;

      const role = await db.roles.findUnique({
        where: { id },
        select: { role_code: true },
      });

      if (!role) {
        throw new Error('Không tìm thấy vai trò');
      }

      if (role.role_code === 'ADMIN') {
        throw new Error('Không thể chỉnh sửa quyền của ADMIN - ADMIN có toàn quyền tự động');
      }

      // Delete all existing permissions for this role
      await db.role_permissions.deleteMany({
        where: { role_id: id },
      });

      // Insert new permissions
      let insertedCount = 0;
      for (const perm of permissions) {
        if (perm.canView || perm.canCreate || perm.canEdit || perm.canDelete) {
          await db.role_permissions.create({
            data: {
              role_id: id,
              permission_id: perm.id,
              can_view: perm.canView,
              can_create: perm.canCreate,
              can_edit: perm.canEdit,
              can_delete: perm.canDelete,
            },
          });
          insertedCount++;
        }
      }

      return {
        message: `Cập nhật thành công ${insertedCount} quyền`,
        insertedCount,
      };
    }),


});

export default rolesRouter;
