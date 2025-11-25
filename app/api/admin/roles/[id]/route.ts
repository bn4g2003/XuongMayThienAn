import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('admin.roles', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa vai trò'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { roleCode, roleName, description } = body;

    if (!roleCode || !roleName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
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

    // Cập nhật role
    await query(
      `UPDATE roles 
       SET role_code = $1, role_name = $2, description = $3
       WHERE id = $4`,
      [roleCode, roleName, description || null, id]
    );

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
    const { hasPermission, error } = await requirePermission('admin.roles', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa vai trò'
      }, { status: 403 });
    }

    const { id } = await params;

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
