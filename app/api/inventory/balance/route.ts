import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function GET() {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.balance', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem tồn kho'
      }, { status: 403 });
    }

    // Data segregation
    let whereClause = '';
    let params: any[] = [];
    
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      whereClause = 'WHERE w.branch_id = $1';
      params.push(currentUser.branchId);
    }

    // Chi tiết tồn kho theo từng kho
    const details = await query(
      `SELECT 
        w.id as "warehouseId",
        w.warehouse_name as "warehouseName",
        COALESCE(m.material_code, p.product_code) as "itemCode",
        COALESCE(m.material_name, p.product_name) as "itemName",
        CASE WHEN m.id IS NOT NULL THEN 'NVL' ELSE 'THANH_PHAM' END as "itemType",
        ib.quantity,
        COALESCE(m.unit, p.unit) as unit
       FROM inventory_balances ib
       JOIN warehouses w ON w.id = ib.warehouse_id
       LEFT JOIN materials m ON m.id = ib.material_id
       LEFT JOIN products p ON p.id = ib.product_id
       ${whereClause}
       ORDER BY w.warehouse_name, "itemName"`,
      params
    );

    // Tổng hợp tồn kho (tổng trên tất cả kho)
    const summary = await query(
      `SELECT 
        COALESCE(m.material_code, p.product_code) as "itemCode",
        COALESCE(m.material_name, p.product_name) as "itemName",
        CASE WHEN m.id IS NOT NULL THEN 'NVL' ELSE 'THANH_PHAM' END as "itemType",
        SUM(ib.quantity) as "totalQuantity",
        COALESCE(m.unit, p.unit) as unit
       FROM inventory_balances ib
       JOIN warehouses w ON w.id = ib.warehouse_id
       LEFT JOIN materials m ON m.id = ib.material_id
       LEFT JOIN products p ON p.id = ib.product_id
       ${whereClause}
       GROUP BY "itemCode", "itemName", "itemType", unit
       ORDER BY "itemName"`,
      params
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        details: details.rows,
        summary: summary.rows
      }
    });

  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
