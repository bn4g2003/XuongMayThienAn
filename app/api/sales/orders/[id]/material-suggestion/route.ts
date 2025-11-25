import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.orders', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem gợi ý nhập hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);

    // Lấy chi tiết đơn hàng
    const orderDetails = await query(
      `SELECT 
        od.product_id as "productId",
        p.product_name as "productName",
        od.quantity as "orderQuantity"
       FROM order_details od
       JOIN products p ON p.id = od.product_id
       WHERE od.order_id = $1`,
      [orderId]
    );

    if (orderDetails.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy sản phẩm trong đơn hàng'
      }, { status: 404 });
    }

    // Tính toán nguyên liệu cần thiết
    const materialNeeds: any = {};

    for (const detail of orderDetails.rows) {
      // Lấy BOM của sản phẩm
      const bomResult = await query(
        `SELECT 
          b.material_id as "materialId",
          m.material_code as "materialCode",
          m.material_name as "materialName",
          b.quantity as "quantityPerProduct",
          b.unit,
          m.unit as "materialUnit"
         FROM bom b
         JOIN materials m ON m.id = b.material_id
         WHERE b.product_id = $1`,
        [detail.productId]
      );

      // Tính tổng nguyên liệu cần
      for (const bom of bomResult.rows) {
        const totalNeeded = bom.quantityPerProduct * detail.orderQuantity;
        
        if (!materialNeeds[bom.materialId]) {
          materialNeeds[bom.materialId] = {
            materialId: bom.materialId,
            materialCode: bom.materialCode,
            materialName: bom.materialName,
            unit: bom.unit || bom.materialUnit,
            totalNeeded: 0,
            currentStock: 0,
            needToImport: 0,
            products: []
          };
        }
        
        materialNeeds[bom.materialId].totalNeeded += totalNeeded;
        materialNeeds[bom.materialId].products.push({
          productName: detail.productName,
          quantity: detail.orderQuantity,
          materialPerProduct: bom.quantityPerProduct
        });
      }
    }

    // Lấy tồn kho hiện tại của các nguyên liệu theo từng kho
    const materialIds = Object.keys(materialNeeds).map(id => parseInt(id));
    
    if (materialIds.length > 0) {
      let stockResult;
      if (currentUser.roleCode === 'ADMIN') {
        // ADMIN xem tồn kho tất cả kho
        stockResult = await query(
          `SELECT 
            ib.material_id as "materialId",
            ib.warehouse_id as "warehouseId",
            ib.quantity as "stock"
           FROM inventory_balances ib
           WHERE ib.material_id = ANY($1)`,
          [materialIds]
        );
      } else {
        // User thường chỉ xem tồn kho trong chi nhánh
        stockResult = await query(
          `SELECT 
            ib.material_id as "materialId",
            ib.warehouse_id as "warehouseId",
            ib.quantity as "stock"
           FROM inventory_balances ib
           JOIN warehouses w ON w.id = ib.warehouse_id
           WHERE ib.material_id = ANY($1)
             AND w.branch_id = $2`,
          [materialIds, currentUser.branchId]
        );
      }

      // Lưu tồn kho theo từng kho
      for (const stock of stockResult.rows) {
        if (materialNeeds[stock.materialId]) {
          if (!materialNeeds[stock.materialId].stockByWarehouse) {
            materialNeeds[stock.materialId].stockByWarehouse = {};
          }
          materialNeeds[stock.materialId].stockByWarehouse[stock.warehouseId] = parseFloat(stock.stock) || 0;
        }
      }

      // Tính tổng tồn kho (để hiển thị ban đầu)
      for (const materialId in materialNeeds) {
        const stockByWarehouse = materialNeeds[materialId].stockByWarehouse || {};
        const totalStock = Object.values(stockByWarehouse).reduce((sum: number, qty: any) => sum + qty, 0);
        materialNeeds[materialId].currentStock = totalStock;
        materialNeeds[materialId].needToImport = Math.max(
          0,
          materialNeeds[materialId].totalNeeded - totalStock
        );
      }
    }

    // Lấy danh sách kho NVL trong chi nhánh (hoặc tất cả nếu ADMIN)
    let warehousesResult;
    if (currentUser.roleCode === 'ADMIN') {
      // ADMIN xem tất cả kho NVL
      warehousesResult = await query(
        `SELECT 
          id,
          warehouse_code as "warehouseCode",
          warehouse_name as "warehouseName",
          warehouse_type as "warehouseType"
         FROM warehouses
         WHERE is_active = true AND warehouse_type = 'NVL'
         ORDER BY warehouse_name`
      );
    } else {
      // User thường chỉ xem kho NVL trong chi nhánh
      warehousesResult = await query(
        `SELECT 
          id,
          warehouse_code as "warehouseCode",
          warehouse_name as "warehouseName",
          warehouse_type as "warehouseType"
         FROM warehouses
         WHERE branch_id = $1 AND is_active = true AND warehouse_type = 'NVL'
         ORDER BY warehouse_name`,
        [currentUser.branchId]
      );
    }

    console.log('Warehouses found:', warehousesResult.rows.length, 'for user:', currentUser.username, 'role:', currentUser.roleCode);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        materials: Object.values(materialNeeds),
        warehouses: warehousesResult.rows
      }
    });

  } catch (error) {
    console.error('Get material suggestion error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
