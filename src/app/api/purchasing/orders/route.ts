import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.orders', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem đơn đặt hàng'
      }, { status: 403 });
    }

    const result = await db.purchase_orders.findMany({
      where: {
        branch_id: currentUser.branchId
      },
      include: {
        suppliers: { select: { supplier_name: true } },
        users: { select: { full_name: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    const formattedResult = result.map(po => ({
      id: po.id,
      poCode: po.po_code,
      supplierName: po.suppliers?.supplier_name,
      orderDate: po.order_date,
      expectedDate: po.expected_date,
      totalAmount: po.total_amount,
      status: po.status,
      createdBy: po.users?.full_name,
      createdAt: po.created_at
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: formattedResult
    });

  } catch (error) {
    console.error('Get purchase orders error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.orders', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo đơn đặt hàng'
      }, { status: 403 });
    }

    const body = await request.json();
    const { supplierId, orderDate, expectedDate, notes, items } = body;

    if (!items || items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Đơn đặt hàng phải có ít nhất 1 nguyên liệu'
      }, { status: 400 });
    }

    const totalAmount = items.reduce((sum: number, item: any) =>
      sum + (item.quantity * item.unitPrice), 0
    );

    // Tạo mã đơn
    const today = new Date();
    const dateStr = today.getFullYear().toString().slice(-2) +
                   (today.getMonth() + 1).toString().padStart(2, '0') +
                   today.getDate().toString().padStart(2, '0');

    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const count = await db.purchase_orders.count({
      where: {
        created_at: {
          gte: todayStart,
          lt: todayEnd
        }
      }
    });

    const poCode = `PO${dateStr}${String(count + 1).padStart(4, '0')}`;

    // Tạo đơn đặt hàng
    const createdPO = await db.purchase_orders.create({
      data: {
        po_code: poCode,
        supplier_id: supplierId,
        branch_id: currentUser.branchId,
        order_date: new Date(orderDate),
        expected_date: expectedDate ? new Date(expectedDate) : null,
        total_amount: totalAmount,
        notes: notes || null,
        created_by: currentUser.id
      },
      select: { id: true }
    });

    const poId = createdPO.id;

    // Thêm chi tiết
    for (const item of items) {
      await db.purchase_order_details.create({
        data: {
          purchase_order_id: poId,
          material_id: item.materialId,
          item_code: item.itemCode || null,
          item_name: item.itemName,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_amount: item.quantity * item.unitPrice,
          notes: item.notes || null
        }
      });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: poId, poCode }
    });

  } catch (error) {
    console.error('Create purchase order error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
