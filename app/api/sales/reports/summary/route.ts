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

    // Data segregation - Admin xem tất cả, user chỉ xem chi nhánh của mình
    let branchFilter = '';
    let params: any[] = [startDate, endDate];
    
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      branchFilter = ' AND o.branch_id = $3';
      params.push(currentUser.branchId);
    }

    // Tổng quan đơn hàng
    const ordersResult = await query(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(final_amount), 0) as total_amount,
        COALESCE(SUM(COALESCE(paid_amount, 0)), 0) as total_paid,
        COALESCE(SUM(final_amount - COALESCE(paid_amount, 0)), 0) as total_unpaid,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed_orders,
        COUNT(CASE WHEN status = 'WAITING_MATERIAL' THEN 1 END) as waiting_material_orders,
        COUNT(CASE WHEN status = 'IN_PRODUCTION' THEN 1 END) as in_production_orders,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders
      FROM orders o
      WHERE o.order_date::date BETWEEN $1::date AND $2::date
      ${branchFilter}
    `, params);

    // Top khách hàng
    const topCustomersResult = await query(`
      SELECT 
        c.id,
        c.customer_code as "customerCode",
        c.customer_name as "customerName",
        COUNT(o.id) as "totalOrders",
        COALESCE(SUM(o.final_amount), 0) as "totalAmount"
      FROM customers c
      JOIN orders o ON o.customer_id = c.id
      WHERE o.order_date::date BETWEEN $1::date AND $2::date
        AND o.status != 'CANCELLED'
        ${branchFilter}
      GROUP BY c.id, c.customer_code, c.customer_name
      ORDER BY COALESCE(SUM(o.final_amount), 0) DESC
      LIMIT 10
    `, params);

    // Top sản phẩm bán chạy
    const topProductsResult = await query(`
      SELECT 
        p.id,
        p.product_code as "productCode",
        p.product_name as "productName",
        p.unit,
        COALESCE(SUM(od.quantity), 0) as "totalQuantity",
        COALESCE(SUM(od.total_amount), 0) as "totalAmount"
      FROM products p
      JOIN order_details od ON od.product_id = p.id
      JOIN orders o ON o.id = od.order_id
      WHERE o.order_date::date BETWEEN $1::date AND $2::date
        AND o.status != 'CANCELLED'
        ${branchFilter}
      GROUP BY p.id, p.product_code, p.product_name, p.unit
      ORDER BY COALESCE(SUM(od.quantity), 0) DESC
      LIMIT 10
    `, params);

    const summary = {
      totalOrders: parseInt(ordersResult.rows[0]?.total_orders || '0'),
      totalAmount: parseFloat(ordersResult.rows[0]?.total_amount || '0'),
      totalPaid: parseFloat(ordersResult.rows[0]?.total_paid || '0'),
      totalUnpaid: parseFloat(ordersResult.rows[0]?.total_unpaid || '0'),
      completedOrders: parseInt(ordersResult.rows[0]?.completed_orders || '0'),
      pendingOrders: parseInt(ordersResult.rows[0]?.pending_orders || '0'),
      confirmedOrders: parseInt(ordersResult.rows[0]?.confirmed_orders || '0'),
      waitingMaterialOrders: parseInt(ordersResult.rows[0]?.waiting_material_orders || '0'),
      inProductionOrders: parseInt(ordersResult.rows[0]?.in_production_orders || '0'),
      cancelledOrders: parseInt(ordersResult.rows[0]?.cancelled_orders || '0'),
      topCustomers: topCustomersResult.rows,
      topProducts: topProductsResult.rows,
    };

    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('Error fetching sales summary:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi lấy dữ liệu tổng quan' },
      { status: 500 }
    );
  }
}
