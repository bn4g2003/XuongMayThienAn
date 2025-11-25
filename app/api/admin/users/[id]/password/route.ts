import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('admin.users', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền đổi mật khẩu'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng nhập mật khẩu mới'
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mật khẩu phải có ít nhất 6 ký tự'
      }, { status: 400 });
    }

    // Kiểm tra user có tồn tại không
    const userCheck = await query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy người dùng'
      }, { status: 404 });
    }

    // Cập nhật mật khẩu (không mã hóa)
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPassword, userId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
