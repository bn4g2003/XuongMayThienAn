import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// PUT - Cập nhật user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền chỉnh sửa user
    const { hasPermission, error } = await requirePermission('admin.users', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền chỉnh sửa người dùng'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { fullName, email, phone, branchId, roleId, isActive } = body;

    const result = await db.users.update({
      where: { id: parseInt(id) },
      data: {
        full_name: fullName,
        email: email,
        phone: phone,
        branch_id: branchId,
        role_id: roleId,
        is_active: isActive
      },
      select: {
        id: true,
        user_code: true,
        username: true,
        full_name: true
      }
    });

    // Transform to match expected format
    const transformedResult = {
      id: result.id,
      userCode: result.user_code,
      username: result.username,
      fullName: result.full_name
    };

    return NextResponse.json<ApiResponse>({
      success: true,
      data: transformedResult,
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// DELETE - Xóa user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền xóa user
    const { hasPermission, error } = await requirePermission('admin.users', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa người dùng'
      }, { status: 403 });
    }

    const { id } = await params;

    await db.users.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa người dùng thành công'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
