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
        error: error || 'Không có quyền xem báo cáo'
      }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    const whereCondition = {
      order_date: {
        gte: new Date(startDate + 'T00:00:00'),
        lte: new Date(endDate + 'T23:59:59')
      },
      ...(currentUser.roleCode !== 'ADMIN' && currentUser.branchId ? { branch_id: currentUser.branchId } : {})
    };

    // Tổng quan đơn hàng
    const summaryAgg = await db.orders.aggregate({
      where: whereCondition,
      _count: { id: true },
      _sum: {
        final_amount: true,
        paid_amount: true
      }
    });

    const statusCounts = await Promise.all([
      db.orders.count({ where: { ...whereCondition, status: 'COMPLETED' } }),
      db.orders.count({ where: { ...whereCondition, status: 'PENDING' } }),
      db.orders.count({ where: { ...whereCondition, status: 'CONFIRMED' } }),
      db.orders.count({ where: { ...whereCondition, status: 'WAITING_MATERIAL' } }),
      db.orders.count({ where: { ...whereCondition, status: 'IN_PRODUCTION' } }),
      db.orders.count({ where: { ...whereCondition, status: 'CANCELLED' } })
    ]);

    // Top khách hàng
    const ordersWithCustomers = await db.orders.findMany({
      where: { ...whereCondition, status: { not: 'CANCELLED' } },
      select: {
        final_amount: true,
        customers: {
          select: { id: true, customer_code: true, customer_name: true }
        }
      }
    });

    const customerMap = new Map<string, { id: number; customerCode: string; customerName: string; totalOrders: number; totalAmount: number }>();

    for (const order of ordersWithCustomers) {
      if (!order.customers) continue;
      const cust = order.customers;
      const key = cust.id.toString();
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: cust.id,
          customerCode: cust.customer_code,
          customerName: cust.customer_name,
          totalOrders: 0,
          totalAmount: 0
        });
      }
      const data = customerMap.get(key)!;
      data.totalOrders += 1;
      data.totalAmount += Number(order.final_amount);
    }

    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    // Top sản phẩm bán chạy
    const orderDetailsWithProducts = await db.order_details.findMany({
      where: {
        orders: { ...whereCondition, status: { not: 'CANCELLED' } }
      },
      select: {
        quantity: true,
        total_amount: true,
        products: {
          select: { id: true, product_code: true, product_name: true, unit: true }
        }
      }
    });

    const productMap = new Map<string, { id: number; productCode: string; productName: string; unit: string; totalQuantity: number; totalAmount: number }>();

    for (const detail of orderDetailsWithProducts) {
      if (!detail.products) continue;
      const prod = detail.products;
      const key = prod.id.toString();
      if (!productMap.has(key)) {
        productMap.set(key, {
          id: prod.id,
          productCode: prod.product_code,
          productName: prod.product_name,
          unit: prod.unit || '',
          totalQuantity: 0,
          totalAmount: 0
        });
      }
      const data = productMap.get(key)!;
      data.totalQuantity += Number(detail.quantity);
      data.totalAmount += Number(detail.total_amount);
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    const summary = {
      totalOrders: summaryAgg._count.id,
      totalAmount: Number(summaryAgg._sum.final_amount || 0),
      totalPaid: Number(summaryAgg._sum.paid_amount || 0),
      totalUnpaid: Number(summaryAgg._sum.final_amount || 0) - Number(summaryAgg._sum.paid_amount || 0),
      completedOrders: statusCounts[0],
      pendingOrders: statusCounts[1],
      confirmedOrders: statusCounts[2],
      waitingMaterialOrders: statusCounts[3],
      inProductionOrders: statusCounts[4],
      cancelledOrders: statusCounts[5],
      topCustomers,
      topProducts
    };

    return NextResponse.json({ success: true, data: summary });
  } catch (error: unknown) {
    console.error('Error fetching sales summary:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Lỗi khi lấy dữ liệu tổng quan' },
      { status: 500 }
    );
  }
}
