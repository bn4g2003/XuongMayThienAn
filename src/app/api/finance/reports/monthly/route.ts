import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('finance.reports', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem báo cáo'
      }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    // Build where clause with date range and branch filtering
    const where: {
      transaction_date: { gte: Date; lte: Date };
      branch_id?: number;
    } = {
      transaction_date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      where.branch_id = currentUser.branchId;
    }

    // Fetch cash book transactions
    const transactions = await db.cash_books.findMany({
      where,
      select: {
        transaction_date: true,
        transaction_type: true,
        amount: true
      },
      orderBy: {
        transaction_date: 'asc'
      }
    });

    // Aggregate by month
    const monthlyMap = new Map<string, { revenue: number; expense: number; profit: number }>();

    transactions.forEach(transaction => {
      const month = transaction.transaction_date.toISOString().slice(0, 7); // YYYY-MM format
      const amount = Number(transaction.amount);

      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { revenue: 0, expense: 0, profit: 0 });
      }

      const monthly = monthlyMap.get(month)!;
      if (transaction.transaction_type === 'THU') {
        monthly.revenue += amount;
        monthly.profit += amount;
      } else if (transaction.transaction_type === 'CHI') {
        monthly.expense += amount;
        monthly.profit -= amount;
      }
    });

    // Convert to array and sort by month
    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        expense: data.expense,
        profit: data.profit
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({ success: true, data: monthlyData });
  } catch (error: unknown) {
    console.error('Error fetching monthly data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Lỗi khi lấy dữ liệu theo tháng';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
