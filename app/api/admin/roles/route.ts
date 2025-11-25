import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Kiểm tra quyền xem roles
    const { hasPermission, user: currentUser, error } = await requirePermission('admin.roles', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền truy cập'
      }, { status: 403 });
    }

    // ✅ ROLES LÀ GLOBAL - KHÔNG LỌC THEO CHI NHÁNH
    // Chỉ lọc theo level để bảo mật:
    // - ADMIN: Xem tất cả roles (level 1-5) của tất cả chi nhánh
    // - User khác: Chỉ xem roles level 1-3 của tất cả chi nhánh
    let levelFilter = '';
    if (currentUser.roleCode !== 'ADMIN') {
      levelFilter = 'WHERE COALESCE(r.level, 3) <= 3';
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
       ${levelFilter}
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
    const { hasPermission, user: currentUser, error } = await requirePermission('admin.roles', 'create');
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

    // Chỉ ADMIN mới được tạo role cấp cao (level 4-5)
    if (currentUser.roleCode !== 'ADMIN' && roleLevel > 3) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Chỉ Admin mới có thể tạo role cấp cao (Level 4-5)'
      }, { status: 403 });
    }

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
