import { query } from '@/lib/db';
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

    // Data segregation
    let branchFilter = '';
    let params: any[] = [startDate, endDate];
    
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      branchFilter = ' AND branch_id = $3';
      params.push(currentUser.branchId);
    }

    // Get total revenue from orders (tiền đã thu từ khách hàng)
    const revenueFromOrdersResult = await query(`
      SELECT COALESCE(SUM(COALESCE(paid_amount, 0)), 0) as revenue_from_orders
      FROM orders
      WHERE status != 'CANCELLED'
        AND order_date::date BETWEEN $1::date AND $2::date
        ${branchFilter}
    `, params);

    // Get total revenue from cash_books (các khoản thu khác)
    const revenueFromCashBooksResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as revenue_from_cashbooks
      FROM cash_books
      WHERE transaction_type = 'THU'
        AND transaction_date::date BETWEEN $1::date AND $2::date
        ${branchFilter}
    `, params);

    // Get total expense from purchase orders (tiền đã trả cho NCC)
    const expenseFromPurchaseResult = await query(`
      SELECT COALESCE(SUM(COALESCE(paid_amount, 0)), 0) as expense_from_purchase
      FROM purchase_orders
      WHERE status != 'CANCELLED'
        AND order_date::date BETWEEN $1::date AND $2::date
        ${branchFilter}
    `, params);

    // Get total expense from cash_books (các khoản chi khác)
    const expenseFromCashBooksResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as expense_from_cashbooks
      FROM cash_books
      WHERE transaction_type = 'CHI'
        AND transaction_date::date BETWEEN $1::date AND $2::date
        ${branchFilter}
    `, params);

    const totalRevenue = 
      parseFloat(revenueFromOrdersResult.rows[0]?.revenue_from_orders || '0') +
      parseFloat(revenueFromCashBooksResult.rows[0]?.revenue_from_cashbooks || '0');
    
    const totalExpense = 
      parseFloat(expenseFromPurchaseResult.rows[0]?.expense_from_purchase || '0') +
      parseFloat(expenseFromCashBooksResult.rows[0]?.expense_from_cashbooks || '0');

    // Get total receivable (customer debts) - tính từ đơn hàng
    let receivableParams: any[] = [];
    let receivableFilter = '';
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      receivableFilter = ' AND o.branch_id = $1';
      receivableParams.push(currentUser.branchId);
    }

    const receivableResult = await query(`
      SELECT COALESCE(SUM(o.final_amount - COALESCE(o.paid_amount, 0)), 0) as total_receivable
      FROM orders o
      WHERE o.status != 'CANCELLED'
        AND (o.final_amount - COALESCE(o.paid_amount, 0)) > 0
        ${receivableFilter}
    `, receivableParams);

    // Get total payable (supplier debts) - tính từ đơn mua
    let payableParams: any[] = [];
    let payableFilter = '';
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      payableFilter = ' AND po.branch_id = $1';
      payableParams.push(currentUser.branchId);
    }

    const payableResult = await query(`
      SELECT COALESCE(SUM(po.total_amount - COALESCE(po.paid_amount, 0)), 0) as total_payable
      FROM purchase_orders po
      WHERE po.status != 'CANCELLED'
        AND (po.total_amount - COALESCE(po.paid_amount, 0)) > 0
        ${payableFilter}
    `, payableParams);

    // Get cash balance from cash_books
    let cashParams: any[] = [];
    let cashFilter = '';
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      cashFilter = ' WHERE branch_id = $1';
      cashParams.push(currentUser.branchId);
    }

    const cashBalanceResult = await query(`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN payment_method = 'CASH' AND transaction_type = 'THU' THEN amount
          WHEN payment_method = 'CASH' AND transaction_type = 'CHI' THEN -amount
          ELSE 0 
        END), 0) as cash_balance
      FROM cash_books
      ${cashFilter}
    `, cashParams);

    // Get bank balance
    let bankParams: any[] = [];
    let bankFilter = 'WHERE is_active = true';
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      bankFilter += ' AND branch_id = $1';
      bankParams.push(currentUser.branchId);
    }

    const bankBalanceResult = await query(`
      SELECT COALESCE(SUM(balance), 0) as bank_balance
      FROM bank_accounts
      ${bankFilter}
    `, bankParams);

    const summary = {
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense,
      totalReceivable: parseFloat(receivableResult.rows[0]?.total_receivable || '0'),
      totalPayable: parseFloat(payableResult.rows[0]?.total_payable || '0'),
      cashBalance: parseFloat(cashBalanceResult.rows[0]?.cash_balance || '0'),
      bankBalance: parseFloat(bankBalanceResult.rows[0]?.bank_balance || '0'),
    };

    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('Error fetching financial summary:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi lấy dữ liệu tổng quan' },
      { status: 500 }
    );
  }
}
