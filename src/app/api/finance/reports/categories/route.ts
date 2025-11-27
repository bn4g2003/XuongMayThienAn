import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    // Fetch cash book transactions with their financial categories
    const transactions = await db.cash_books.findMany({
      where: {
        transaction_date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        financial_categories: {
          select: {
            category_name: true,
            type: true
          }
        }
      }
    });

    // Aggregate by category name and type
    const categoryMap = new Map<string, { name: string; type: string; value: number }>();

    transactions.forEach(transaction => {
      const category = transaction.financial_categories;
      if (category) {
        const key = `${category.category_name}-${category.type}`;
        const amount = Number(transaction.amount);

        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            name: category.category_name,
            type: category.type,
            value: 0
          });
        }

        categoryMap.get(key)!.value += amount;
      }
    });

    // Convert to array and sort by value descending
    const categoryData = Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({ success: true, data: categoryData });
  } catch (error: unknown) {
    console.error('Error fetching category data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Lỗi khi lấy dữ liệu danh mục';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
