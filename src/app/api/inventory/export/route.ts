import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.export', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem phiếu xuất kho'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const warehouseId = searchParams.get('warehouseId');

    const transactions = await db.inventory_transactions.findMany({
      where: {
        transaction_type: 'XUAT',
        ...(warehouseId && { from_warehouse_id: parseInt(warehouseId) }),
        ...(status && status !== 'ALL' && { status }),
        ...(currentUser.roleCode !== 'ADMIN' && currentUser.branchId && {
          warehouses_inventory_transactions_from_warehouse_idTowarehouses: {
            branch_id: currentUser.branchId
          }
        })
      },
      include: {
        warehouses_inventory_transactions_from_warehouse_idTowarehouses: true,
        users_inventory_transactions_created_byTousers: true,
        users_inventory_transactions_approved_byTousers: true,
        inventory_transaction_details: {
          select: { total_amount: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const result = transactions.map(trans => ({
      id: trans.id,
      transactionCode: trans.transaction_code,
      fromWarehouseId: trans.from_warehouse_id,
      fromWarehouseName: trans.warehouses_inventory_transactions_from_warehouse_idTowarehouses?.warehouse_name,
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
    console.error('Get export transactions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// POST - Tạo phiếu xuất kho
export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.export', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo phiếu xuất kho'
      }, { status: 403 });
    }

    const body = await request.json();
    const { fromWarehouseId, notes, items } = body;

    if (!fromWarehouseId || !items || items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    // Tạo mã phiếu
    const today = new Date();
    const dateStr = today.getFullYear().toString().slice(2) + (today.getMonth() + 1).toString().padStart(2, '0') + today.getDate().toString().padStart(2, '0');
    const prefix = 'PX' + dateStr;

    const lastTrans = await db.inventory_transactions.findFirst({
      where: { transaction_code: { startsWith: prefix } },
      orderBy: { transaction_code: 'desc' },
      select: { transaction_code: true }
    });

    let nextNum = 1;
    if (lastTrans) {
      const lastNumStr = lastTrans.transaction_code.slice(8);
      const lastNum = parseInt(lastNumStr);
      nextNum = lastNum + 1;
    }
    const transactionCode = prefix + nextNum.toString().padStart(4, '0');

    let transactionId = 0;

    await db.$transaction(async (tx) => {
      // Tạo phiếu xuất
      const newTrans = await tx.inventory_transactions.create({
        data: {
          transaction_code: transactionCode,
          transaction_type: 'XUAT',
          from_warehouse_id: fromWarehouseId,
          status: 'PENDING',
          notes,
          created_by: currentUser.id
        }
      });

      transactionId = newTrans.id;

      // Kiểm tra tồn kho trước khi tạo phiếu
      for (const item of items) {
        const balance = await tx.inventory_balances.findFirst({
          where: {
            warehouse_id: fromWarehouseId,
            product_id: item.productId || null,
            material_id: item.materialId || null
          },
          select: { quantity: true }
        });

        if (!balance) {
          throw new Error(`Không tìm thấy tồn kho cho mặt hàng này`);
        }

        if (balance.quantity < item.quantity) {
          throw new Error(`Số lượng tồn kho không đủ`);
        }
      }

      // Thêm chi tiết (chưa trừ tồn kho)
      for (const item of items) {
        await tx.inventory_transaction_details.create({
          data: {
            transaction_id: transactionId,
            product_id: item.productId || null,
            material_id: item.materialId || null,
            quantity: item.quantity,
            notes: item.notes || null
          }
        });
      }
    });

    // Phiếu ở trạng thái PENDING - chờ duyệt

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: transactionId, transactionCode },
      message: 'Tạo phiếu xuất kho thành công'
    });

  } catch (error) {
    console.error('Create export transaction error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
