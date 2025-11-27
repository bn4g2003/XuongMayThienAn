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

    const groupedData = await db.orders.groupBy({
      by: ['order_date'],
      where: whereCondition,
      _count: { id: true },
      _sum: {
        final_amount: true,
        paid_amount: true
      },
      orderBy: { order_date: 'asc' }
    });

    const dailyData = groupedData.map(group => {
      const revenue = Number(group._sum.final_amount || 0);
      const paid = Number(group._sum.paid_amount || 0);
      const unpaid = revenue - paid;
      const dateStr = group.order_date.toISOString().split('T')[0];

      return {
        date: dateStr,
        orders: group._count.id,
        revenue,
        paid,
        unpaid
      };
    });

    return NextResponse.json({ success: true, data: dailyData });
  } catch (error: any) {
    console.error('Error fetching daily sales:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi lấy dữ liệu theo ngày' },
      { status: 500 }
    );
  }
}
