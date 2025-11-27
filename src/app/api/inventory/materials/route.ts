import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy tồn kho nguyên vật liệu theo warehouse
export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.balance', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem tồn kho'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');

    if (!warehouseId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Thiếu warehouseId'
      }, { status: 400 });
    }

    // Data segregation - Kiểm tra quyền truy cập kho
    const warehouseIdNum = parseInt(warehouseId);

    const where: any = {};
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      // User chỉ xem được NVL thuộc chi nhánh của mình
      where.branch_id = currentUser.branchId;
    }

    // LEFT JOIN để hiển thị tất cả NVL, kể cả chưa có trong inventory_balances
    const materials = await db.materials.findMany({
      where,
      include: {
        inventory_balances: {
          where: {
            warehouse_id: warehouseIdNum
          },
          select: {
            quantity: true
          }
        }
      },
      orderBy: {
        material_name: 'asc'
      }
    });

    const result = materials.map(material => ({
      id: material.id,
      itemCode: material.material_code,
      itemName: material.material_name,
      quantity: material.inventory_balances[0]?.quantity || 0,
      unit: material.unit
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get inventory materials error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
