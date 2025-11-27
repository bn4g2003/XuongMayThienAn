import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('admin.warehouses', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền chỉnh sửa kho'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { warehouseName, branchId, address, warehouseType, isActive } = body;

    const result = await db.warehouses.update({
      where: { id: parseInt(id) },
      data: {
        warehouse_name: warehouseName,
        branch_id: branchId,
        address: address,
        warehouse_type: warehouseType,
        is_active: isActive
      },
      select: {
        id: true,
        warehouse_code: true,
        warehouse_name: true
      }
    });

    // Transform to match expected format
    const transformedResult = {
      id: result.id,
      warehouseCode: result.warehouse_code,
      warehouseName: result.warehouse_name
    };

    return NextResponse.json<ApiResponse>({
      success: true,
      data: transformedResult,
      message: 'Cập nhật kho thành công'
    });

  } catch (error) {
    console.error('Update warehouse error:', error);
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
    const { hasPermission, error } = await requirePermission('admin.warehouses', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa kho'
      }, { status: 403 });
    }

    const { id } = await params;
    await db.warehouses.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa kho thành công'
    });

  } catch (error) {
    console.error('Delete warehouse error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
