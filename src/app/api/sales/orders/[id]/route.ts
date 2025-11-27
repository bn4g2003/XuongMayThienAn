import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.orders', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem đơn hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);

    // Lấy thông tin đơn hàng
    const orderData = await db.orders.findUnique({
      where: { id: orderId },
      include: {
        customers: true,
        users: true
      }
    });

    if (!orderData) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy đơn hàng'
      }, { status: 404 });
    }

    // Lấy chi tiết sản phẩm
    const detailsData = await db.order_details.findMany({
      where: { order_id: orderId },
      include: { products: true },
      orderBy: { id: 'asc' }
    });

    const details = detailsData.map(detail => ({
      id: detail.id,
      productCode: detail.products?.product_code,
      productName: detail.products?.product_name,
      quantity: detail.quantity,
      unitPrice: Number(detail.unit_price),
      totalAmount: Number(detail.total_amount),
      notes: detail.notes
    }));

    // Parse production_status nếu có
    let production = {
      cutting: false,
      sewing: false,
      finishing: false,
      quality_check: false
    };

    if (orderData.production_status) {
      try {
        production = typeof orderData.production_status === 'string'
          ? JSON.parse(orderData.production_status)
          : orderData.production_status;
      } catch (e) {
        console.error('Parse production_status error:', e);
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: orderData.id,
        orderCode: orderData.order_code,
        customerName: orderData.customers?.customer_name,
        orderDate: orderData.order_date,
        totalAmount: Number(orderData.total_amount),
        discountAmount: Number(orderData.discount_amount || 0),
        finalAmount: Number(orderData.final_amount),
        status: orderData.status,
        production,
        notes: orderData.notes,
        createdBy: orderData.users?.full_name,
        createdAt: orderData.created_at,
        details
      }
    });

  } catch (error) {
    console.error('Get order detail error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
