import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy tổng hợp công nợ theo khách hàng và nhà cung cấp
export async function GET(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.debts', 'view');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'customers' hoặc 'suppliers'

    if (type === 'customers') {
      // Lấy danh sách khách hàng với tổng công nợ từ đơn hàng
      const customers = await db.customers.findMany({
        where: { is_active: true },
        include: {
          orders: {
            where: {
              status: { not: 'CANCELLED' },
              ...(user.roleCode !== 'ADMIN' && { branch_id: user.branchId })
            },
            select: {
              id: true,
              final_amount: true,
              paid_amount: true,
              payment_status: true
            }
          }
        }
      });

      // Tính toán tổng hợp cho từng khách hàng
      const result = customers
        .map(customer => {
          const orders = customer.orders;
          const totalOrders = orders.length;
          const totalAmount = orders.reduce((sum, order) => sum + Number(order.final_amount || 0), 0);
          const paidAmount = orders.reduce((sum, order) => sum + Number(order.paid_amount || 0), 0);
          const remainingAmount = totalAmount - paidAmount;
          const unpaidOrders = orders.filter(order => order.payment_status !== 'PAID').length;

          return {
            id: customer.id,
            customerCode: customer.customer_code,
            customerName: customer.customer_name,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            totalOrders,
            totalAmount,
            paidAmount,
            remainingAmount,
            unpaidOrders
          };
        })
        .filter(customer => customer.totalOrders > 0)
        .sort((a, b) => b.remainingAmount - a.remainingAmount);

      return NextResponse.json({
        success: true,
        data: result,
      });
    } else if (type === 'suppliers') {
      // Lấy danh sách nhà cung cấp với tổng công nợ từ đơn mua
      const suppliers = await db.suppliers.findMany({
        where: { is_active: true },
        include: {
          purchase_orders: {
            where: {
              status: { not: 'CANCELLED' },
              ...(user.roleCode !== 'ADMIN' && { branch_id: user.branchId })
            },
            select: {
              id: true,
              total_amount: true,
              paid_amount: true,
              payment_status: true
            }
          }
        }
      });

      // Tính toán tổng hợp cho từng nhà cung cấp
      const result = suppliers
        .map(supplier => {
          const orders = supplier.purchase_orders;
          const totalOrders = orders.length;
          const totalAmount = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
          const paidAmount = orders.reduce((sum, order) => sum + Number(order.paid_amount || 0), 0);
          const remainingAmount = totalAmount - paidAmount;
          const unpaidOrders = orders.filter(order => order.payment_status !== 'PAID').length;

          return {
            id: supplier.id,
            supplierCode: supplier.supplier_code,
            supplierName: supplier.supplier_name,
            phone: supplier.phone,
            email: supplier.email,
            address: supplier.address,
            totalOrders,
            totalAmount,
            paidAmount,
            remainingAmount,
            unpaidOrders
          };
        })
        .filter(supplier => supplier.totalOrders > 0)
        .sort((a, b) => b.remainingAmount - a.remainingAmount);

      return NextResponse.json({
        success: true,
        data: result,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Type phải là customers hoặc suppliers' },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error('Error fetching debt summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
