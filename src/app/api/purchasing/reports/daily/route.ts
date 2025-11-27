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
        error: error || 'Không có quyền xem báo cáo'
      }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    // Data segregation
    const whereClause: {
      order_date: { gte: Date; lte: Date };
      status: { not: string };
      branch_id?: number;
    } = {
      order_date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      },
      status: {
        not: 'CANCELLED'
      }
    };

    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      whereClause.branch_id = currentUser.branchId;
    }

    const orders = await db.purchase_orders.findMany({
      where: whereClause,
      select: {
        order_date: true,
        total_amount: true
      },
      orderBy: {
        order_date: 'asc'
      }
    });

    // Group by date and calculate aggregates
    const dailyMap = new Map<string, { orders: number; amount: number }>();

    orders.forEach(order => {
      const dateKey = order.order_date.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { orders: 0, amount: 0 };
      dailyMap.set(dateKey, {
        orders: existing.orders + 1,
        amount: existing.amount + Number(order.total_amount)
      });
    });

    const dailyData = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        amount: data.amount
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ success: true, data: dailyData });
  } catch (error: unknown) {
    console.error('Error fetching daily purchasing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Lỗi khi lấy dữ liệu theo ngày';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
