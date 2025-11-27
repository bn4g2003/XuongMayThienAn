import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Kiểm tra quyền xem tồn kho
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.balance', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem kho'
      }, { status: 403 });
    }

    // Data segregation - Admin xem tất cả, user chỉ xem kho thuộc chi nhánh
    const where: any = {
      is_active: true,
      ...(currentUser.roleCode !== 'ADMIN' && currentUser.branchId && {
        branch_id: currentUser.branchId
      })
    };

    const result = await db.warehouses.findMany({
      where,
      include: {
        branches: true
      },
      orderBy: [
        { warehouse_type: 'asc' },
        { warehouse_name: 'asc' }
      ]
    });

    const formattedResult = result.map(warehouse => ({
      id: warehouse.id,
      warehouseCode: warehouse.warehouse_code,
      warehouseName: warehouse.warehouse_name,
      warehouseType: warehouse.warehouse_type,
      branchId: warehouse.branch_id,
      branchName: warehouse.branches?.branch_name
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: formattedResult
    });

  } catch (error) {
    console.error('Get inventory warehouses error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
