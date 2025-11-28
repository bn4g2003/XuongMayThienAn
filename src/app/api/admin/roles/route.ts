import { db, query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Kiểm tra quyền xem roles
    const { hasPermission, error } = await requirePermission('admin.roles', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền truy cập'
      }, { status: 403 });
    }

    // ✅ ROLES LÀ GLOBAL - KHÔNG LỌC THEO CHI NHÁNH
    const roles = await db.roles.findMany({
      select: {
        id: true,
        role_code: true,
        role_name: true,
        description: true,
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    const result = roles.map(role => ({
      id: role.id,
      roleCode: role.role_code,
      roleName: role.role_name,
      description: role.description,
      userCount: role._count.users
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền tạo role
    const { hasPermission, error } = await requirePermission('admin.roles', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo vai trò'
      }, { status: 403 });
    }

    const body = await request.json();
    const { roleCode, roleName, description } = body;

    if (!roleCode || !roleName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    const result = await db.roles.create({
      data: {
        role_code: roleCode,
        role_name: roleName,
        description: description,
      },
      select: {
        id: true,
        role_code: true,
        role_name: true,
      }
    });

    const roleId = result.id;

    // Tự động cấp quyền theo level mặc định
    await query(
      `SELECT auto_assign_permissions_by_level($1, $2)`,
      [roleId, 3]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: result.id,
        roleCode: result.role_code,
        roleName: result.role_name,
      },
      message: 'Tạo vai trò thành công'
    });

  } catch (error: unknown) {
    console.error('Create role error:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã vai trò đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
