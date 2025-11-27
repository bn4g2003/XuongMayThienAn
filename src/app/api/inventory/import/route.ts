import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy danh sách phiếu nhập kho
export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.import', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem phiếu nhập kho'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const warehouseId = searchParams.get('warehouseId');

    const where = {
      transaction_type: 'NHAP',
      ...(warehouseId && { to_warehouse_id: parseInt(warehouseId) }),
      ...(status && status !== 'ALL' && { status }),
      ...(currentUser.roleCode !== 'ADMIN' && currentUser.branchId && {
        warehouses_inventory_transactions_to_warehouse_idTowarehouses: {
          branch_id: currentUser.branchId
        }
      })
    };

    const transactions = await db.inventory_transactions.findMany({
      where,
      include: {
        warehouses_inventory_transactions_to_warehouse_idTowarehouses: true,
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
    console.error('Get import transactions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// POST - Tạo phiếu nhập kho mới
export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.import', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo phiếu nhập kho'
      }, { status: 403 });
    }

    const body = await request.json();
    const { toWarehouseId, notes, items } = body;

    if (!toWarehouseId || !items || items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    // Kiểm tra quyền truy cập kho
    if (currentUser.roleCode !== 'ADMIN') {
      const warehouse = await db.warehouses.findUnique({
        where: { id: toWarehouseId },
        select: { branch_id: true }
      });
      if (!warehouse || warehouse.branch_id !== currentUser.branchId) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Không có quyền nhập vào kho này'
        }, { status: 403 });
      }
    }

    // Tạo mã phiếu tự động
    const today = new Date();
    const dateStr = today.getFullYear().toString().slice(2) + (today.getMonth() + 1).toString().padStart(2, '0') + today.getDate().toString().padStart(2, '0');
    const prefix = 'PN' + dateStr;

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

    // Tạo phiếu nhập
    const newTrans = await db.inventory_transactions.create({
      data: {
        transaction_code: transactionCode,
        transaction_type: 'NHAP',
        to_warehouse_id: toWarehouseId,
        status: 'PENDING',
        notes,
        created_by: currentUser.id
      }
    });

    const transactionId = newTrans.id;

    // Thêm chi tiết (chưa cập nhật tồn kho)
    for (const item of items) {
      await db.inventory_transaction_details.create({
        data: {
          transaction_id: transactionId,
          product_id: item.productId || null,
          material_id: item.materialId || null,
          quantity: item.quantity,
          unit_price: item.unitPrice || 0,
          total_amount: item.quantity * (item.unitPrice || 0),
          notes: item.notes || null
        }
      });
    }

    // Phiếu ở trạng thái PENDING - chờ duyệt

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: transactionId, transactionCode },
      message: 'Tạo phiếu nhập kho thành công'
    });

  } catch (error) {
    console.error('Create import transaction error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
