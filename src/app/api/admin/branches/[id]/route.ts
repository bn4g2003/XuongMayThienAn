import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('admin.branches', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền chỉnh sửa chi nhánh'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { branchName, address, phone, email, isActive } = body;

    const result = await db.branches.update({
      where: { id: parseInt(id) },
      data: {
        branch_name: branchName,
        address: address,
        phone: phone,
        email: email,
        is_active: isActive,
        updated_at: new Date()
      },
      select: {
        id: true,
        branch_code: true,
        branch_name: true
      }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: result.id,
        branchCode: result.branch_code,
        branchName: result.branch_name
      },
      message: 'Cập nhật chi nhánh thành công'
    });

  } catch (error) {
    console.error('Update branch error:', error);
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
    const { hasPermission, error } = await requirePermission('admin.branches', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa chi nhánh'
      }, { status: 403 });
    }

    const { id } = await params;

    await db.branches.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa chi nhánh thành công'
    });

  } catch (error) {
    console.error('Delete branch error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
