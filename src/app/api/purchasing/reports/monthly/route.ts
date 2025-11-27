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
        total_amount: true,
        paid_amount: true
      },
      orderBy: {
        order_date: 'asc'
      }
    });

    // Group by month and calculate aggregates
    const monthlyMap = new Map<string, { orders: number; amount: number; paid: number; unpaid: number }>();

    orders.forEach(order => {
      const monthKey = order.order_date.toISOString().slice(0, 7); // YYYY-MM format
      const existing = monthlyMap.get(monthKey) || { orders: 0, amount: 0, paid: 0, unpaid: 0 };
      const totalAmount = Number(order.total_amount);
      const paidAmount = Number(order.paid_amount || 0);
      const unpaidAmount = totalAmount - paidAmount;

      monthlyMap.set(monthKey, {
        orders: existing.orders + 1,
        amount: existing.amount + totalAmount,
        paid: existing.paid + paidAmount,
        unpaid: existing.unpaid + unpaidAmount
      });
    });

    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        orders: data.orders,
        amount: data.amount,
        paid: data.paid,
        unpaid: data.unpaid
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({ success: true, data: monthlyData });
  } catch (error: unknown) {
    console.error('Error fetching monthly purchasing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Lỗi khi lấy dữ liệu theo tháng';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
