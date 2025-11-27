import { db, query } from '@/lib/db';
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
    const warehouse = await db.warehouses.findUnique({
      where: { id: parseInt(warehouseId) },
      include: {
        branches: true
      }
    });

    if (!warehouse) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy kho'
      }, { status: 404 });
    }

    const warehouseData = {
      id: warehouse.id,
      warehouseCode: warehouse.warehouse_code,
      warehouseName: warehouse.warehouse_name,
      warehouseType: warehouse.warehouse_type,
      branchId: warehouse.branch_id,
      branchName: warehouse.branches?.branch_name
    };

    // Kiểm tra quyền truy cập kho
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId !== warehouseData.branchId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không có quyền truy cập kho này'
      }, { status: 403 });
    }

    // 1. Tồn kho hiện tại
    const currentBalance = await getCurrentBalance(warehouseData.id, warehouseData.warehouseType!, warehouseData.branchId!);

    // 2. Lịch sử giao dịch
    const transactions = await getTransactionHistory(warehouseData.id, warehouseData.warehouseType!, startDate, endDate);

    // 3. Thống kê tổng hợp
    const statistics = await getStatistics(warehouseData.id, warehouseData.warehouseType!, startDate, endDate);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        warehouse: warehouseData,
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
    const materials = await db.materials.findMany({
      where: {
        branch_id: branchId
      },
      include: {
        inventory_balances: {
          where: {
            warehouse_id: warehouseId
          },
          select: {
            quantity: true
          }
        }
      },
      orderBy: {
        material_name: 'asc'
      }
    });

    return materials.map(material => ({
      itemCode: material.material_code,
      itemName: material.material_name,
      itemType: 'NVL',
      quantity: material.inventory_balances[0]?.quantity || 0,
      unit: material.unit
    }));
  } else {
    const products = await db.products.findMany({
      where: {
        branch_id: branchId,
        is_active: true
      },
      include: {
        inventory_balances: {
          where: {
            warehouse_id: warehouseId
          },
          select: {
            quantity: true
          }
        }
      },
      orderBy: {
        product_name: 'asc'
      }
    });

    return products.map(product => ({
      itemCode: product.product_code,
      itemName: product.product_name,
      itemType: 'THANH_PHAM',
      quantity: product.inventory_balances[0]?.quantity || 0,
      unit: product.unit
    }));
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
    return result;
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
    return result;
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

  return result;
}
