import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.balance', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem lịch sử'
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

    // Lấy tất cả giao dịch liên quan đến kho này
    const warehouseIdNum = parseInt(warehouseId);

    const where = {
      AND: [
        {
          OR: [
            { from_warehouse_id: warehouseIdNum },
            { to_warehouse_id: warehouseIdNum }
          ]
        },
        ...(currentUser.roleCode !== 'ADMIN' && currentUser.branchId ? [{
          OR: [
            { warehouses_inventory_transactions_from_warehouse_idTowarehouses: { branch_id: currentUser.branchId } },
            { warehouses_inventory_transactions_to_warehouse_idTowarehouses: { branch_id: currentUser.branchId } }
          ]
        }] : [])
      ]
    };

    const transactions = await db.inventory_transactions.findMany({
      where,
      include: {
        warehouses_inventory_transactions_from_warehouse_idTowarehouses: true,
        warehouses_inventory_transactions_to_warehouse_idTowarehouses: true,
        users_inventory_transactions_created_byTousers: true,
        users_inventory_transactions_approved_byTousers: true,
        inventory_transaction_details: {
          select: { total_amount: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 100
    });

    const result = transactions.map(trans => ({
      id: trans.id,
      transactionCode: trans.transaction_code,
      transactionType: trans.transaction_type,
      fromWarehouseId: trans.from_warehouse_id,
      fromWarehouseName: trans.warehouses_inventory_transactions_from_warehouse_idTowarehouses?.warehouse_name,
      toWarehouseId: trans.to_warehouse_id,
      toWarehouseName: trans.warehouses_inventory_transactions_to_warehouse_idTowarehouses?.warehouse_name,
      status: trans.status,
      notes: trans.notes,
      createdBy: trans.created_by,
      createdByName: trans.users_inventory_transactions_created_byTousers?.full_name,
      createdAt: trans.created_at,
      approvedBy: trans.approved_by,
      approvedByName: trans.users_inventory_transactions_approved_byTousers?.full_name,
      approvedAt: trans.approved_at,
      totalAmount: trans.inventory_transaction_details.reduce((sum, detail) => sum + Number(detail.total_amount || 0), 0)
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
