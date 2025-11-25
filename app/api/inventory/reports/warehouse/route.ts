import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.balance', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem báo cáo kho'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!warehouseId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Thiếu warehouseId'
      }, { status: 400 });
    }

    // Lấy thông tin kho
    const warehouseInfo = await query(
      `SELECT 
        w.id, 
        w.warehouse_code as "warehouseCode",
        w.warehouse_name as "warehouseName", 
        w.warehouse_type as "warehouseType", 
        w.branch_id as "branchId",
        b.branch_name as "branchName"
       FROM warehouses w
       LEFT JOIN branches b ON b.id = w.branch_id
       WHERE w.id = $1`,
      [parseInt(warehouseId)]
    );

    if (warehouseInfo.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy kho'
      }, { status: 404 });
    }

    const warehouse = warehouseInfo.rows[0];

    // Kiểm tra quyền truy cập kho
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId !== warehouse.branchId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không có quyền truy cập kho này'
      }, { status: 403 });
    }

    // 1. Tồn kho hiện tại
    const currentBalance = await getCurrentBalance(warehouse.id, warehouse.warehouseType, warehouse.branchId);

    // 2. Lịch sử giao dịch
    const transactions = await getTransactionHistory(warehouse.id, warehouse.warehouseType, startDate, endDate);

    // 3. Thống kê tổng hợp
    const statistics = await getStatistics(warehouse.id, warehouse.warehouseType, startDate, endDate);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        warehouse,
        currentBalance,
        transactions,
        statistics
      }
    });

  } catch (error) {
    console.error('Get warehouse report error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi server'
    }, { status: 500 });
  }
}

// Lấy tồn kho hiện tại
async function getCurrentBalance(warehouseId: number, warehouseType: string, branchId: number) {
  if (warehouseType === 'NVL') {
    const result = await query(
      `SELECT 
        m.material_code as "itemCode",
        m.material_name as "itemName",
        'NVL' as "itemType",
        CAST(COALESCE(ib.quantity, 0) AS DECIMAL(10,3)) as quantity,
        m.unit
       FROM materials m
       LEFT JOIN inventory_balances ib ON ib.material_id = m.id AND ib.warehouse_id = $1
       WHERE m.branch_id = $2
       ORDER BY m.material_name`,
      [warehouseId, branchId]
    );
    return result.rows;
  } else {
    const result = await query(
      `SELECT 
        p.product_code as "itemCode",
        p.product_name as "itemName",
        'THANH_PHAM' as "itemType",
        CAST(COALESCE(ib.quantity, 0) AS DECIMAL(10,3)) as quantity,
        p.unit
       FROM products p
       LEFT JOIN inventory_balances ib ON ib.product_id = p.id AND ib.warehouse_id = $1
       WHERE p.branch_id = $2 AND p.is_active = true
       ORDER BY p.product_name`,
      [warehouseId, branchId]
    );
    return result.rows;
  }
}

// Lấy lịch sử giao dịch
async function getTransactionHistory(warehouseId: number, warehouseType: string, startDate: string | null, endDate: string | null) {
  let dateFilter = '';
  const params: any[] = [warehouseId];
  
  if (startDate && endDate) {
    dateFilter = 'AND transaction_date >= $2 AND transaction_date <= $3';
    params.push(startDate, endDate);
  }

  if (warehouseType === 'NVL') {
    const result = await query(
      `SELECT 
        ih.id,
        ih.transaction_date as "transactionDate",
        ih.transaction_type as "transactionType",
        ih.reference_code as "referenceCode",
        m.material_code as "itemCode",
        m.material_name as "itemName",
        CAST(ih.quantity AS DECIMAL(10,3)) as quantity,
        m.unit,
        ih.notes,
        u.full_name as "createdBy"
       FROM inventory_history ih
       JOIN materials m ON m.id = ih.material_id
       LEFT JOIN users u ON u.id = ih.created_by
       WHERE ih.warehouse_id = $1 ${dateFilter}
       ORDER BY ih.transaction_date DESC, ih.id DESC
       LIMIT 100`,
      params
    );
    return result.rows;
  } else {
    const result = await query(
      `SELECT 
        ih.id,
        ih.transaction_date as "transactionDate",
        ih.transaction_type as "transactionType",
        ih.reference_code as "referenceCode",
        p.product_code as "itemCode",
        p.product_name as "itemName",
        CAST(ih.quantity AS DECIMAL(10,3)) as quantity,
        p.unit,
        ih.notes,
        u.full_name as "createdBy"
       FROM inventory_history ih
       JOIN products p ON p.id = ih.product_id
       LEFT JOIN users u ON u.id = ih.created_by
       WHERE ih.warehouse_id = $1 ${dateFilter}
       ORDER BY ih.transaction_date DESC, ih.id DESC
       LIMIT 100`,
      params
    );
    return result.rows;
  }
}

// Lấy thống kê
async function getStatistics(warehouseId: number, warehouseType: string, startDate: string | null, endDate: string | null) {
  let dateFilter = '';
  const params: any[] = [warehouseId];
  
  if (startDate && endDate) {
    dateFilter = 'AND transaction_date >= $2 AND transaction_date <= $3';
    params.push(startDate, endDate);
  }

  const result = await query(
    `SELECT 
      transaction_type as "transactionType",
      COUNT(*) as "transactionCount",
      CAST(SUM(quantity) AS DECIMAL(10,3)) as "totalQuantity"
     FROM inventory_history
     WHERE warehouse_id = $1 ${dateFilter}
     GROUP BY transaction_type`,
    params
  );

  return result.rows;
}
