import { query } from '@/lib/db';
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
    let branchFilter = '';
    let params: any[] = [startDate, endDate];
    
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      branchFilter = ' AND po.branch_id = $3';
      params.push(currentUser.branchId);
    }

    // Tổng quan đơn mua
    const ordersResult = await query(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(COALESCE(paid_amount, 0)), 0) as total_paid,
        COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) as total_unpaid,
        COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_orders,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders
      FROM purchase_orders po
      WHERE po.order_date::date BETWEEN $1::date AND $2::date
      ${branchFilter}
    `, params);

    // Top nhà cung cấp
    const topSuppliersResult = await query(`
      SELECT 
        s.id,
        s.supplier_code as "supplierCode",
        s.supplier_name as "supplierName",
        COUNT(po.id) as "totalOrders",
        COALESCE(SUM(po.total_amount), 0) as "totalAmount"
      FROM suppliers s
      JOIN purchase_orders po ON po.supplier_id = s.id
      WHERE po.order_date::date BETWEEN $1::date AND $2::date
        AND po.status != 'CANCELLED'
        ${branchFilter}
      GROUP BY s.id, s.supplier_code, s.supplier_name
      ORDER BY COALESCE(SUM(po.total_amount), 0) DESC
      LIMIT 10
    `, params);

    // Top sản phẩm/nguyên liệu mua nhiều
    const topProductsResult = await query(`
      SELECT 
        COALESCE(m.id, 0) as id,
        pod.item_code as "productCode",
        pod.item_name as "productName",
        pod.unit,
        COALESCE(SUM(pod.quantity), 0) as "totalQuantity",
        COALESCE(SUM(pod.total_amount), 0) as "totalAmount"
      FROM purchase_order_details pod
      LEFT JOIN materials m ON m.id = pod.material_id
      JOIN purchase_orders po ON po.id = pod.purchase_order_id
      WHERE po.order_date::date BETWEEN $1::date AND $2::date
        AND po.status != 'CANCELLED'
        ${branchFilter}
      GROUP BY m.id, pod.item_code, pod.item_name, pod.unit
      ORDER BY COALESCE(SUM(pod.quantity), 0) DESC
      LIMIT 10
    `, params);

    const summary = {
      totalOrders: parseInt(ordersResult.rows[0]?.total_orders || '0'),
      totalAmount: parseFloat(ordersResult.rows[0]?.total_amount || '0'),
      totalPaid: parseFloat(ordersResult.rows[0]?.total_paid || '0'),
      totalUnpaid: parseFloat(ordersResult.rows[0]?.total_unpaid || '0'),
      completedOrders: parseInt(ordersResult.rows[0]?.completed_orders || '0'),
      approvedOrders: parseInt(ordersResult.rows[0]?.approved_orders || '0'),
      pendingOrders: parseInt(ordersResult.rows[0]?.pending_orders || '0'),
      cancelledOrders: parseInt(ordersResult.rows[0]?.cancelled_orders || '0'),
      topSuppliers: topSuppliersResult.rows,
      topProducts: topProductsResult.rows,
    };

    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('Error fetching purchasing summary:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi lấy dữ liệu tổng quan' },
      { status: 500 }
    );
  }
}
