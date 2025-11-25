import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    const result = await query(`
      SELECT 
        TO_CHAR(order_date, 'YYYY-MM-DD') as date,
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as amount
      FROM purchase_orders
      WHERE order_date::date BETWEEN $1::date AND $2::date
        AND status != 'CANCELLED'
      GROUP BY TO_CHAR(order_date, 'YYYY-MM-DD')
      ORDER BY date
    `, [startDate, endDate]);

    const dailyData = result.rows.map((row: any) => ({
      date: row.date,
      orders: parseInt(row.orders || '0'),
      amount: parseFloat(row.amount || '0'),
    }));

    return NextResponse.json({ success: true, data: dailyData });
  } catch (error: any) {
    console.error('Error fetching daily purchasing:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi lấy dữ liệu theo ngày' },
      { status: 500 }
    );
  }
}
