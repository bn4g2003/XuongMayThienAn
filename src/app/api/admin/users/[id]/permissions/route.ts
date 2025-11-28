import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy permissions của role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền xem permissions
    const { hasPermission, error } = await requirePermission('admin.roles', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem phân quyền'
      }, { status: 403 });
    }

    const { id } = await params;
    const roleId = parseInt(id);

    // Lấy thông tin role
    const role = await db.roles.findUnique({
      where: { id: roleId },
      select: { role_name: true, role_code: true }
    });

    if (!role) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy vai trò'
      }, { status: 404 });
    }

    // Kiểm tra nếu là ADMIN
    if (role.role_code === 'ADMIN' || roleId === 1) {
      // ADMIN có toàn quyền - lấy tất cả permissions với full quyền
      const permissions = await db.permissions.findMany({
        orderBy: [{ module: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          permission_code: true,
          permission_name: true,
          module: true,
          description: true,
        }
      });

      console.log(`[Permissions API] ADMIN Role - Auto granted all ${permissions.length} permissions`);

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          roleName: role.role_name,
          permissions: permissions.map(p => ({
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
          note: 'ADMIN có toàn quyền tự động - không cần lưu vào database'
        }
      });
    }

    // Lấy tất cả permissions và trạng thái của role này
    const permissions = await db.permissions.findMany({
      orderBy: [{ module: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        permission_code: true,
        permission_name: true,
        module: true,
        description: true,
        role_permissions: {
          where: { role_id: roleId },
          select: {
            can_view: true,
            can_create: true,
            can_edit: true,
            can_delete: true,
          },
        },
      },
    });

    const formattedPermissions = permissions.map(p => {
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
    });

    console.log(`[Permissions API] Role ID: ${roleId}, Found ${formattedPermissions.length} permissions`);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        roleName: role.role_name,
        permissions: formattedPermissions
      }
    });

  } catch (error) {
    console.error('Get role permissions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// PUT - Cập nhật permissions của role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền chỉnh sửa permissions
    const { hasPermission, error } = await requirePermission('admin.roles', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền chỉnh sửa phân quyền'
      }, { status: 403 });
    }

    const { id } = await params;
    const roleId = parseInt(id);
    const body = await request.json();
    const { permissions } = body;

    console.log(`[Update Permissions] Role ID: ${roleId}, Updating ${permissions.length} permissions`);

    // Kiểm tra nếu là ADMIN role
    const role = await db.roles.findUnique({
      where: { id: roleId },
      select: { role_code: true }
    });
    if (!role) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy vai trò'
      }, { status: 404 });
    }

    if (role.role_code === 'ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể chỉnh sửa quyền của ADMIN - ADMIN có toàn quyền tự động'
      }, { status: 400 });
    }

    // Xóa tất cả permissions cũ của role
    const deleteResult = await db.role_permissions.deleteMany({
      where: { role_id: roleId }
    });
    console.log(`[Update Permissions] Deleted ${deleteResult.count} old permissions`);

    // Insert permissions mới
    let insertedCount = 0;
    for (const perm of permissions) {
      // Chỉ insert nếu có ít nhất 1 quyền được bật
      if (perm.canView || perm.canCreate || perm.canEdit || perm.canDelete) {
        await db.role_permissions.create({
          data: {
            role_id: roleId,
            permission_id: perm.id,
            can_view: perm.canView,
            can_create: perm.canCreate,
            can_edit: perm.canEdit,
            can_delete: perm.canDelete,
          }
        });
        insertedCount++;
      }
    }

    console.log(`[Update Permissions] Inserted ${insertedCount} new permissions`);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Cập nhật thành công ${insertedCount} quyền`,
      data: { insertedCount }
    });

  } catch (error) {
    console.error('Update role permissions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
