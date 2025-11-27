import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    // Fetch all cash book transactions for the date range
    const transactions = await db.cash_books.findMany({
      where: {
        transaction_date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      select: {
        transaction_date: true,
        transaction_type: true,
        amount: true
      },
      orderBy: {
        transaction_date: 'asc'
      }
    });

    // Group transactions by date and calculate daily cash flow
    const dailyMap = new Map<string, { cashIn: number; cashOut: number }>();

    transactions.forEach(transaction => {
      const date = transaction.transaction_date.toISOString().split('T')[0];
      const amount = Number(transaction.amount);

      if (!dailyMap.has(date)) {
        dailyMap.set(date, { cashIn: 0, cashOut: 0 });
      }

      const daily = dailyMap.get(date)!;
      if (transaction.transaction_type === 'THU') {
        daily.cashIn += amount;
      } else if (transaction.transaction_type === 'CHI') {
        daily.cashOut += amount;
      }
    });

    // Calculate cumulative balance
    const cashFlowData: Array<{
      date: string;
      cashIn: number;
      cashOut: number;
      balance: number;
    }> = [];

    let runningBalance = 0;

    // Sort dates and calculate running balance
    const sortedDates = Array.from(dailyMap.keys()).sort();

    sortedDates.forEach(date => {
      const daily = dailyMap.get(date)!;
      runningBalance += daily.cashIn - daily.cashOut;

      cashFlowData.push({
        date,
        cashIn: daily.cashIn,
        cashOut: daily.cashOut,
        balance: runningBalance
      });
    });

    return NextResponse.json({ success: true, data: cashFlowData });
  } catch (error: unknown) {
    console.error('Error fetching cash flow data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Lỗi khi lấy dữ liệu dòng tiền';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
