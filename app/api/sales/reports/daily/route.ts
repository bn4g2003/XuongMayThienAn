import { query } from '@/lib/db';
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

    // Data segregation
    let branchFilter = '';
    let params: any[] = [startDate, endDate];
    
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      branchFilter = ' AND branch_id = $3';
      params.push(currentUser.branchId);
    }

    const result = await query(`
      SELECT 
        TO_CHAR(order_date, 'YYYY-MM-DD') as date,
        COUNT(*) as orders,
        COALESCE(SUM(final_amount), 0) as revenue,
        COALESCE(SUM(paid_amount), 0) as paid,
        COALESCE(SUM(final_amount - COALESCE(paid_amount, 0)), 0) as unpaid
      FROM orders
      WHERE order_date::date BETWEEN $1::date AND $2::date
        AND status != 'CANCELLED'
        ${branchFilter}
      GROUP BY TO_CHAR(order_date, 'YYYY-MM-DD')
      ORDER BY date
    `, params);

    const dailyData = result.rows.map((row: any) => ({
      date: row.date,
      orders: parseInt(row.orders || '0'),
      revenue: parseFloat(row.revenue || '0'),
      paid: parseFloat(row.paid || '0'),
      unpaid: parseFloat(row.unpaid || '0'),
    }));

    return NextResponse.json({ success: true, data: dailyData });
  } catch (error: any) {
    console.error('Error fetching daily sales:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi lấy dữ liệu theo ngày' },
      { status: 500 }
    );
  }
}
