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

    // Build base where clause for date and branch filtering
    const getWhereClause = (dateField: string) => {
      const where: Record<string, unknown> & { branch_id?: number } = {
        [dateField]: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };

      if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
        where.branch_id = currentUser.branchId;
      }

      return where;
    };

    // Get total revenue from orders (tiền đã thu từ khách hàng)
    const ordersWhere = getWhereClause('order_date');
    ordersWhere.status = { not: 'CANCELLED' };

    const revenueFromOrders = await db.orders.aggregate({
      where: ordersWhere,
      _sum: {
        paid_amount: true
      }
    });

    // Get total revenue from cash_books (các khoản thu khác)
    const cashBooksRevenueWhere = getWhereClause('transaction_date');
    cashBooksRevenueWhere.transaction_type = 'THU';

    const revenueFromCashBooks = await db.cash_books.aggregate({
      where: cashBooksRevenueWhere,
      _sum: {
        amount: true
      }
    });

    // Get total expense from purchase orders (tiền đã trả cho NCC)
    const purchaseOrdersWhere = getWhereClause('order_date');
    purchaseOrdersWhere.status = { not: 'CANCELLED' };

    const expenseFromPurchase = await db.purchase_orders.aggregate({
      where: purchaseOrdersWhere,
      _sum: {
        paid_amount: true
      }
    });

    // Get total expense from cash_books (các khoản chi khác)
    const cashBooksExpenseWhere = getWhereClause('transaction_date');
    cashBooksExpenseWhere.transaction_type = 'CHI';

    const expenseFromCashBooks = await db.cash_books.aggregate({
      where: cashBooksExpenseWhere,
      _sum: {
        amount: true
      }
    });

    const totalRevenue =
      Number(revenueFromOrders._sum.paid_amount || 0) +
      Number(revenueFromCashBooks._sum.amount || 0);

    const totalExpense =
      Number(expenseFromPurchase._sum.paid_amount || 0) +
      Number(expenseFromCashBooks._sum.amount || 0);

    // Get total receivable (customer debts) - tính từ đơn hàng
    const receivableWhere: {
      status: { not: string };
      branch_id?: number;
    } = {
      status: { not: 'CANCELLED' }
    };

    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      receivableWhere.branch_id = currentUser.branchId;
    }

    const receivableOrders = await db.orders.findMany({
      where: receivableWhere,
      select: {
        final_amount: true,
        paid_amount: true
      }
    });

    const totalReceivable = receivableOrders.reduce((sum, order) => {
      const remaining = Number(order.final_amount || 0) - Number(order.paid_amount || 0);
      return sum + Math.max(0, remaining);
    }, 0);

    // Get total payable (supplier debts) - tính từ đơn mua
    const payableWhere: {
      status: { not: string };
      branch_id?: number;
    } = {
      status: { not: 'CANCELLED' }
    };

    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      payableWhere.branch_id = currentUser.branchId;
    }

    const payableOrders = await db.purchase_orders.findMany({
      where: payableWhere,
      select: {
        total_amount: true,
        paid_amount: true
      }
    });

    const totalPayable = payableOrders.reduce((sum, order) => {
      const remaining = Number(order.total_amount || 0) - Number(order.paid_amount || 0);
      return sum + Math.max(0, remaining);
    }, 0);

    // Get cash balance from cash_books
    const cashBalanceWhere: {
      payment_method: string;
      branch_id?: number;
    } = {
      payment_method: 'CASH'
    };

    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      cashBalanceWhere.branch_id = currentUser.branchId;
    }

    const cashTransactions = await db.cash_books.findMany({
      where: cashBalanceWhere,
      select: {
        transaction_type: true,
        amount: true
      }
    });

    const cashBalance = cashTransactions.reduce((sum, transaction) => {
      const amount = Number(transaction.amount);
      return sum + (transaction.transaction_type === 'THU' ? amount : -amount);
    }, 0);

    // Get bank balance
    const bankBalanceWhere: {
      is_active: boolean;
      branch_id?: number;
    } = {
      is_active: true
    };

    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      bankBalanceWhere.branch_id = currentUser.branchId;
    }

    const bankBalanceResult = await db.bank_accounts.aggregate({
      where: bankBalanceWhere,
      _sum: {
        balance: true
      }
    });

    const bankBalance = Number(bankBalanceResult._sum.balance || 0);

    const summary = {
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense,
      totalReceivable,
      totalPayable,
      cashBalance,
      bankBalance,
    };

    return NextResponse.json({ success: true, data: summary });
  } catch (error: unknown) {
    console.error('Error fetching financial summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Lỗi khi lấy dữ liệu tổng quan';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
