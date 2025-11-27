import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('inventory.export', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem phiếu xuất kho'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const transactionId = parseInt(resolvedParams.id);

    // Lấy thông tin phiếu
    const transaction = await db.inventory_transactions.findUnique({
      where: { id: transactionId },
      include: {
        warehouses_inventory_transactions_from_warehouse_idTowarehouses: true,
        users_inventory_transactions_created_byTousers: true,
        users_inventory_transactions_approved_byTousers: true
      }
    });

    if (!transaction) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy phiếu xuất'
      }, { status: 404 });
    }

    const transData = {
      id: transaction.id,
      transactionCode: transaction.transaction_code,
      fromWarehouseId: transaction.from_warehouse_id,
      fromWarehouseName: transaction.warehouses_inventory_transactions_from_warehouse_idTowarehouses?.warehouse_name,
      status: transaction.status,
      notes: transaction.notes,
      createdBy: transaction.users_inventory_transactions_created_byTousers?.full_name,
      createdAt: transaction.created_at,
      approvedBy: transaction.users_inventory_transactions_approved_byTousers?.full_name,
      approvedAt: transaction.approved_at,
      completedAt: transaction.completed_at
    };

    // Lấy chi tiết
    const details = await db.inventory_transaction_details.findMany({
      where: { transaction_id: transactionId },
      include: {
        materials: true,
        products: true
      },
      orderBy: { id: 'asc' }
    });

    const detailsData = details.map(detail => ({
      id: detail.id,
      itemCode: detail.materials?.material_code || detail.products?.product_code,
      itemName: detail.materials?.material_name || detail.products?.product_name,
      unit: detail.materials?.unit || detail.products?.unit,
      quantity: Number(detail.quantity),
      notes: detail.notes
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...transData,
        details: detailsData
      }
    });

  } catch (error) {
    console.error('Get export detail error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
