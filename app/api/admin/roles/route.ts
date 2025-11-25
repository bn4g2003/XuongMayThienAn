import { query } from '@/lib/db';
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

    const result = await query(
      `SELECT 
        r.id, 
        r.role_code as "roleCode", 
        r.role_name as "roleName", 
        r.description,
        COALESCE(r.level, 3) as level,
        COUNT(u.id) as "userCount"
       FROM roles r
       LEFT JOIN users u ON u.role_id = r.id
       GROUP BY r.id, r.role_code, r.role_name, r.description, r.level
       ORDER BY r.level DESC, r.id`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
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
    const { roleCode, roleName, description, level } = body;

    if (!roleCode || !roleName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    const roleLevel = level || 3; // Mặc định level 3

    const result = await query(
      `INSERT INTO roles (role_code, role_name, description, level)
       VALUES ($1, $2, $3, $4)
       RETURNING id, role_code as "roleCode", role_name as "roleName", level`,
      [roleCode, roleName, description, roleLevel]
    );

    const roleId = result.rows[0].id;

    // Tự động cấp quyền theo level
    await query(
      `SELECT auto_assign_permissions_by_level($1, $2)`,
      [roleId, roleLevel]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Tạo vai trò thành công'
    });

  } catch (error: any) {
    console.error('Create role error:', error);
    if (error.code === '23505') {
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
