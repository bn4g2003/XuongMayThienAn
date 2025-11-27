import { db } from '@/lib/db';
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
    const baseWhereClause: {
      order_date: { gte: Date; lte: Date };
      branch_id?: number;
    } = {
      order_date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      baseWhereClause.branch_id = currentUser.branchId;
    }

    // Tổng quan đơn mua
    const [totalOrders, totalAmount, totalPaid, totalUnpaid, completedOrders, approvedOrders, pendingOrders, cancelledOrders] = await Promise.all([
      db.purchase_orders.count({ where: baseWhereClause }),
      db.purchase_orders.aggregate({
        where: baseWhereClause,
        _sum: { total_amount: true }
      }),
      db.purchase_orders.aggregate({
        where: baseWhereClause,
        _sum: { paid_amount: true }
      }),
      db.purchase_orders.findMany({
        where: baseWhereClause,
        select: { total_amount: true, paid_amount: true }
      }).then(orders => orders.reduce((sum, order) => sum + (Number(order.total_amount) - Number(order.paid_amount || 0)), 0)),
      db.purchase_orders.count({ where: { ...baseWhereClause, status: 'DELIVERED' } }),
      db.purchase_orders.count({ where: { ...baseWhereClause, status: 'APPROVED' } }),
      db.purchase_orders.count({ where: { ...baseWhereClause, status: 'PENDING' } }),
      db.purchase_orders.count({ where: { ...baseWhereClause, status: 'CANCELLED' } })
    ]);

    // Top nhà cung cấp
    const suppliersWithOrders = await db.suppliers.findMany({
      include: {
        purchase_orders: {
          where: {
            ...baseWhereClause,
            status: { not: 'CANCELLED' }
          },
          select: {
            id: true,
            total_amount: true
          }
        }
      }
    });

    const topSuppliers = suppliersWithOrders
      .map(supplier => {
        const orders = supplier.purchase_orders;
        const totalOrders = orders.length;
        const totalAmount = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
        return {
          id: supplier.id,
          supplierCode: supplier.supplier_code,
          supplierName: supplier.supplier_name,
          totalOrders,
          totalAmount
        };
      })
      .filter(supplier => supplier.totalOrders > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    // Top sản phẩm/nguyên liệu mua nhiều
    const orderDetails = await db.purchase_order_details.findMany({
      include: {
        materials: {
          select: {
            id: true
          }
        },
        purchase_orders: {
          where: {
            ...baseWhereClause,
            status: { not: 'CANCELLED' }
          },
          select: {
            id: true
          }
        }
      },
      where: {
        purchase_orders: {
          ...baseWhereClause,
          status: { not: 'CANCELLED' }
        }
      }
    });

    const productMap = new Map<string, {
      id: number;
      productCode: string | null;
      productName: string;
      unit: string | null;
      totalQuantity: number;
      totalAmount: number;
    }>();

    orderDetails.forEach(detail => {
      if (detail.purchase_orders) { // Only include if order matches the date/branch filter
        const key = `${detail.item_code || ''}-${detail.item_name}`;
        const existing = productMap.get(key) || {
          id: detail.materials?.id || 0,
          productCode: detail.item_code,
          productName: detail.item_name || '',
          unit: detail.unit,
          totalQuantity: 0,
          totalAmount: 0
        };

        productMap.set(key, {
          ...existing,
          totalQuantity: existing.totalQuantity + Number(detail.quantity),
          totalAmount: existing.totalAmount + Number(detail.total_amount)
        });
      }
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    const summary = {
      totalOrders,
      totalAmount: Number(totalAmount._sum.total_amount || 0),
      totalPaid: Number(totalPaid._sum.paid_amount || 0),
      totalUnpaid,
      completedOrders,
      approvedOrders,
      pendingOrders,
      cancelledOrders,
      topSuppliers,
      topProducts,
    };

    return NextResponse.json({ success: true, data: summary });
  } catch (error: unknown) {
    console.error('Error fetching purchasing summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Lỗi khi lấy dữ liệu tổng quan';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
