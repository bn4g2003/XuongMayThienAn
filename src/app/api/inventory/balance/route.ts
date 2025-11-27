import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.balance', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem tồn kho'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const showAll = searchParams.get('showAll') !== 'false'; // Mặc định hiển thị tất cả

    if (!warehouseId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Thiếu warehouseId'
      }, { status: 400 });
    }

    // Lấy thông tin kho
    const warehouse = await db.warehouses.findUnique({
      where: { id: parseInt(warehouseId) },
      select: {
        id: true,
        warehouse_name: true,
        warehouse_type: true,
        branch_id: true
      }
    });

    if (!warehouse) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy kho'
      }, { status: 404 });
    }

    const warehouseType = warehouse.warehouse_type;
    const warehouseBranchId = warehouse.branch_id;

    // Kiểm tra quyền truy cập kho
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId !== warehouseBranchId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không có quyền truy cập kho này'
      }, { status: 403 });
    }

    let details;
    let summary;

    if (warehouseType === 'NVL') {
      if (showAll) {
        // Hiển thị tất cả materials của chi nhánh (kể cả quantity = 0)
        const materials = await db.materials.findMany({
          where: { branch_id: warehouseBranchId },
          include: {
            inventory_balances: {
              where: { warehouse_id: parseInt(warehouseId) },
              select: { quantity: true }
            }
          },
          orderBy: { material_name: 'asc' }
        });

        details = materials.map(material => ({
          warehouseId: parseInt(warehouseId),
          warehouseName: warehouse.warehouse_name,
          itemCode: material.material_code,
          itemName: material.material_name,
          itemType: 'NVL',
          quantity: Number(material.inventory_balances[0]?.quantity || 0),
          unit: material.unit
        }));
      } else {
        // Chỉ hiển thị materials có tồn kho > 0
        const balances = await db.inventory_balances.findMany({
          where: {
            warehouse_id: parseInt(warehouseId),
            quantity: { gt: 0 },
            material_id: { not: null }
          },
          include: {
            materials: true
          },
          orderBy: {
            materials: { material_name: 'asc' }
          }
        });

        details = balances
          .filter(balance => balance.materials)
          .map(balance => ({
            warehouseId: parseInt(warehouseId),
            warehouseName: warehouse.warehouse_name,
            itemCode: balance.materials!.material_code,
            itemName: balance.materials!.material_name,
            itemType: 'NVL',
            quantity: Number(balance.quantity),
            unit: balance.materials!.unit
          }));
      }

      // Summary cho NVL
      const materialsSummary = await db.materials.findMany({
        where: { branch_id: warehouseBranchId },
        include: {
          inventory_balances: {
            where: { warehouse_id: parseInt(warehouseId) },
            select: { quantity: true }
          }
        },
        orderBy: { material_name: 'asc' }
      });

      summary = materialsSummary.map(material => ({
        itemCode: material.material_code,
        itemName: material.material_name,
        itemType: 'NVL',
        totalQuantity: Number(material.inventory_balances[0]?.quantity || 0),
        unit: material.unit
      }));

    } else {
      if (showAll) {
        // Hiển thị tất cả products của chi nhánh (kể cả quantity = 0)
        const products = await db.products.findMany({
          where: {
            branch_id: warehouseBranchId,
            is_active: true
          },
          include: {
            inventory_balances: {
              where: { warehouse_id: parseInt(warehouseId) },
              select: { quantity: true }
            }
          },
          orderBy: { product_name: 'asc' }
        });

        details = products.map(product => ({
          warehouseId: parseInt(warehouseId),
          warehouseName: warehouse.warehouse_name,
          itemCode: product.product_code,
          itemName: product.product_name,
          itemType: 'THANH_PHAM',
          quantity: Number(product.inventory_balances[0]?.quantity || 0),
          unit: product.unit
        }));
      } else {
        // Chỉ hiển thị products có tồn kho > 0
        const balances = await db.inventory_balances.findMany({
          where: {
            warehouse_id: parseInt(warehouseId),
            quantity: { gt: 0 },
            product_id: { not: null }
          },
          include: {
            products: true
          },
          orderBy: {
            products: { product_name: 'asc' }
          }
        });

        details = balances
          .filter(balance => balance.products)
          .map(balance => ({
            warehouseId: parseInt(warehouseId),
            warehouseName: warehouse.warehouse_name,
            itemCode: balance.products!.product_code,
            itemName: balance.products!.product_name,
            itemType: 'THANH_PHAM',
            quantity: Number(balance.quantity),
            unit: balance.products!.unit
          }));
      }

      // Summary cho products
      const productsSummary = await db.products.findMany({
        where: {
          branch_id: warehouseBranchId,
          is_active: true
        },
        include: {
          inventory_balances: {
            where: { warehouse_id: parseInt(warehouseId) },
            select: { quantity: true }
          }
        },
        orderBy: { product_name: 'asc' }
      });

      summary = productsSummary.map(product => ({
        itemCode: product.product_code,
        itemName: product.product_name,
        itemType: 'THANH_PHAM',
        totalQuantity: Number(product.inventory_balances[0]?.quantity || 0),
        unit: product.unit
      }));
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        details,
        summary
      }
    });

  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi server'
    }, { status: 500 });
  }
}
