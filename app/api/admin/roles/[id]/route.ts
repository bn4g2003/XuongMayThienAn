import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('admin.roles', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa vai trò'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { roleCode, roleName, description, level } = body;

    if (!roleCode || !roleName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    // Kiểm tra role hiện tại
    const currentRole = await query(
      'SELECT level FROM roles WHERE id = $1',
      [id]
    );

    if (currentRole.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vai trò không tồn tại'
      }, { status: 404 });
    }

    const currentRoleLevel = currentRole.rows[0].level || 3;

    // Nếu không phải ADMIN, không được edit role level > 3
    if (currentUser.roleCode !== 'ADMIN' && currentRoleLevel > 3) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Chỉ Admin mới có thể chỉnh sửa vai trò cấp cao (Level 4-5)'
      }, { status: 403 });
    }

    // Kiểm tra roleCode đã tồn tại chưa (trừ role hiện tại)
    const checkCode = await query(
      'SELECT id FROM roles WHERE role_code = $1 AND id != $2',
      [roleCode, id]
    );

    if (checkCode.rows.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã vai trò đã tồn tại'
      }, { status: 400 });
    }

    const roleLevel = level || 3;

    // Chỉ ADMIN mới được tạo/sửa role thành cấp cao (level 4-5)
    if (currentUser.roleCode !== 'ADMIN' && roleLevel > 3) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Chỉ Admin mới có thể tạo/sửa role cấp cao (Level 4-5)'
      }, { status: 403 });
    }

    // Cập nhật role
    await query(
      `UPDATE roles 
       SET role_code = $1, role_name = $2, description = $3, level = $4
       WHERE id = $5`,
      [roleCode, roleName, description || null, roleLevel, id]
    );

    // Nếu level thay đổi, tự động cập nhật quyền
    if (level) {
      await query(
        `SELECT auto_assign_permissions_by_level($1, $2)`,
        [parseInt(id), roleLevel]
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật vai trò thành công'
    });

  } catch (error) {
    console.error('Update role error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền xóa role
    const { hasPermission, user: currentUser, error } = await requirePermission('admin.roles', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa vai trò'
      }, { status: 403 });
    }

    const { id } = await params;

    // Kiểm tra level của role trước khi xóa
    const roleCheck = await query(
      'SELECT level FROM roles WHERE id = $1',
      [id]
    );

    if (roleCheck.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vai trò không tồn tại'
      }, { status: 404 });
    }

    const roleLevel = roleCheck.rows[0].level || 3;

    // Nếu không phải ADMIN, không được xóa role level > 3
    if (currentUser.roleCode !== 'ADMIN' && roleLevel > 3) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Chỉ Admin mới có thể xóa vai trò cấp cao (Level 4-5)'
      }, { status: 403 });
    }

    // Kiểm tra có user nào đang dùng role này không
    const checkUsers = await query(
      'SELECT COUNT(*) FROM users WHERE role_id = $1',
      [id]
    );

    if (parseInt(checkUsers.rows[0].count) > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa vai trò đang được sử dụng'
      }, { status: 400 });
    }

    // Xóa permissions trước
    await query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
    
    // Xóa role
    await query('DELETE FROM roles WHERE id = $1', [id]);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa vai trò thành công'
    });

  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
