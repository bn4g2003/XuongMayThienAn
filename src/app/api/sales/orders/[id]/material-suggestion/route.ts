import { db } from '@/lib/db';
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
    const orderDetailsData = await db.order_details.findMany({
      where: { order_id: orderId },
      include: { products: true }
    });

    if (orderDetailsData.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy sản phẩm trong đơn hàng'
      }, { status: 404 });
    }

    // Tính toán nguyên liệu cần thiết
    const materialNeeds: any = {};

    for (const detail of orderDetailsData) {
      // Lấy BOM của sản phẩm
      const bomData = await db.bom.findMany({
        where: { product_id: detail.product_id },
        include: { materials: true }
      });

      // Tính tổng nguyên liệu cần
      for (const bom of bomData) {
        const totalNeeded = Number(bom.quantity) * Number(detail.quantity);

        if (!materialNeeds[bom.material_id!]) {
          materialNeeds[bom.material_id!] = {
            materialId: bom.material_id!,
            materialCode: bom.materials?.material_code || '',
            materialName: bom.materials?.material_name || '',
            unit: bom.unit || bom.materials?.unit || '',
            totalNeeded: 0,
            currentStock: 0,
            needToImport: 0,
            products: []
          };
        }

        materialNeeds[bom.material_id!].totalNeeded += totalNeeded;
        materialNeeds[bom.material_id!].products.push({
          productName: detail.products?.product_name || '',
          quantity: detail.quantity,
          materialPerProduct: bom.quantity
        });
      }
    }

    // Lấy tồn kho hiện tại của các nguyên liệu theo từng kho
    const materialIds = Object.keys(materialNeeds).map(id => parseInt(id));

    if (materialIds.length > 0) {
      let stockData;
      if (currentUser.roleCode === 'ADMIN') {
        // ADMIN xem tồn kho tất cả kho
        stockData = await db.inventory_balances.findMany({
          where: { material_id: { in: materialIds } }
        });
      } else {
        // User thường chỉ xem tồn kho trong chi nhánh
        stockData = await db.inventory_balances.findMany({
          where: {
            material_id: { in: materialIds },
            warehouses: { branch_id: currentUser.branchId }
          },
          include: { warehouses: true }
        });
      }

      // Lưu tồn kho theo từng kho
      for (const stock of stockData) {
        if (materialNeeds[stock.material_id!]) {
          if (!materialNeeds[stock.material_id!].stockByWarehouse) {
            materialNeeds[stock.material_id!].stockByWarehouse = {};
          }
          materialNeeds[stock.material_id!].stockByWarehouse[stock.warehouse_id!] = Number(stock.quantity) || 0;
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
    let warehousesData;
    if (currentUser.roleCode === 'ADMIN') {
      // ADMIN xem tất cả kho NVL
      warehousesData = await db.warehouses.findMany({
        where: { is_active: true, warehouse_type: 'NVL' },
        orderBy: { warehouse_name: 'asc' }
      });
    } else {
      // User thường chỉ xem kho NVL trong chi nhánh
      warehousesData = await db.warehouses.findMany({
        where: { branch_id: currentUser.branchId, is_active: true, warehouse_type: 'NVL' },
        orderBy: { warehouse_name: 'asc' }
      });
    }

    console.log('Warehouses found:', warehousesData.length, 'for user:', currentUser.username, 'role:', currentUser.roleCode);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        materials: Object.values(materialNeeds),
        warehouses: warehousesData
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
