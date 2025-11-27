import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('purchasing.suppliers', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa nhóm NCC'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { groupName, description } = body;

    await db.supplier_groups.update({
      where: { id: groupId },
      data: {
        group_name: groupName,
        description: description || null
      }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update supplier group error:', error);
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
    const { hasPermission, error } = await requirePermission('purchasing.suppliers', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa nhóm NCC'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.id);

    const supplierCount = await db.suppliers.count({
      where: { supplier_group_id: groupId }
    });

    if (supplierCount > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa nhóm đã có nhà cung cấp'
      }, { status: 400 });
    }

    await db.supplier_groups.delete({
      where: { id: groupId }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa thành công'
    });

  } catch (error) {
    console.error('Delete supplier group error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
