import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const getBalanceSchema = z.object({
  warehouseId: z.number().int().positive(),
  showAll: z.boolean().optional().default(true),
});

const inventoryBalanceRouter = router({
  getBalance: protectedProcedure
    .input(getBalanceSchema)
    .query(async ({ input }) => {
      const { hasPermission, user, error } = await requirePermission('inventory.balance', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem tồn kho');
      }

      const { warehouseId, showAll } = input;

      // Lấy thông tin kho
      const warehouse = await db.warehouses.findUnique({
        where: { id: warehouseId },
        select: {
          id: true,
          warehouse_name: true,
          warehouse_type: true,
          branch_id: true
        }
      });

      if (!warehouse) {
        throw new Error('Không tìm thấy kho');
      }

      const warehouseType = warehouse.warehouse_type;
      const warehouseBranchId = warehouse.branch_id;

      // Kiểm tra quyền truy cập kho
      if (user.roleCode !== 'ADMIN' && user.branchId !== warehouseBranchId) {
        throw new Error('Không có quyền truy cập kho này');
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
                where: { warehouse_id: warehouseId },
                select: { quantity: true }
              }
            },
            orderBy: { material_name: 'asc' }
          });

          details = materials.map(material => ({
            warehouseId: warehouseId,
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
              warehouse_id: warehouseId,
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
              warehouseId: warehouseId,
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
              where: { warehouse_id: warehouseId },
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
                where: { warehouse_id: warehouseId },
                select: { quantity: true }
              }
            },
            orderBy: { product_name: 'asc' }
          });

          details = products.map(product => ({
            warehouseId: warehouseId,
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
              warehouse_id: warehouseId,
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
              warehouseId: warehouseId,
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
              where: { warehouse_id: warehouseId },
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

      return {
        details,
        summary
      };
    }),
});

export default inventoryBalanceRouter;