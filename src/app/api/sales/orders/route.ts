import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.orders', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem đơn hàng'
      }, { status: 403 });
    }

    const orders = await db.orders.findMany({
      where: { branch_id: currentUser.branchId },
      include: {
        customers: true,
        users: true
      },
      orderBy: { created_at: 'desc' }
    });

    const result = orders.map(order => ({
      id: order.id,
      orderCode: order.order_code,
      customerName: order.customers?.customer_name,
      orderDate: order.order_date,
      totalAmount: Number(order.total_amount),
      discountAmount: Number(order.discount_amount || 0),
      finalAmount: Number(order.final_amount),
      status: order.status,
      createdBy: order.users?.full_name,
      createdAt: order.created_at
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.orders', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo đơn hàng'
      }, { status: 403 });
    }

    const body = await request.json();
    const { customerId, orderDate, items, discountAmount, notes } = body;

    if (!items || items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Đơn hàng phải có ít nhất 1 sản phẩm'
      }, { status: 400 });
    }

    // Tính tổng tiền
    const totalAmount = items.reduce((sum: number, item: any) =>
      sum + (item.quantity * item.unitPrice), 0
    );
    const finalAmount = totalAmount - (discountAmount || 0);

    // Tạo mã đơn hàng
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const orderCount = await db.orders.count({
      where: { created_at: { gte: startOfDay, lt: endOfDay } }
    });

    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
    const orderCode = `DH${dateStr}${String(orderCount + 1).padStart(4, '0')}`;

    // Tạo đơn hàng
    const newOrder = await db.orders.create({
      data: {
        order_code: orderCode,
        customer_id: customerId,
        branch_id: currentUser.branchId,
        order_date: new Date(orderDate),
        total_amount: totalAmount,
        discount_amount: discountAmount || 0,
        final_amount: finalAmount,
        notes: notes || null,
        created_by: currentUser.id
      }
    });

    const orderId = newOrder.id;

    // Thêm chi tiết đơn hàng
    const detailsData = items.map((item: any) => ({
      order_id: orderId,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      cost_price: item.costPrice || 0,
      total_amount: item.quantity * item.unitPrice,
      notes: item.notes || null
    }));

    await db.order_details.createMany({
      data: detailsData
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: orderId, orderCode }
    });

  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
