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

    const whereCondition: any = {
      order_date: {
        gte: new Date(startDate + 'T00:00:00'),
        lte: new Date(endDate + 'T23:59:59')
      },
      status: { not: 'CANCELLED' }
    };

    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      whereCondition.branch_id = currentUser.branchId;
    }

    const orders = await db.orders.findMany({
      where: whereCondition,
      select: {
        order_date: true,
        final_amount: true,
        paid_amount: true
      }
    });

    // Group by month
    const monthlyMap = new Map<string, { orders: number; revenue: number; paid: number; unpaid: number }>();

    for (const order of orders) {
      const month = order.order_date.toISOString().slice(0, 7); // YYYY-MM
      const revenue = Number(order.final_amount);
      const paid = Number(order.paid_amount || 0);
      const unpaid = revenue - paid;

      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { orders: 0, revenue: 0, paid: 0, unpaid: 0 });
      }

      const data = monthlyMap.get(month)!;
      data.orders += 1;
      data.revenue += revenue;
      data.paid += paid;
      data.unpaid += unpaid;
    }

    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({ success: true, data: monthlyData });
  } catch (error: any) {
    console.error('Error fetching monthly sales:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi lấy dữ liệu theo tháng' },
      { status: 500 }
    );
  }
}
