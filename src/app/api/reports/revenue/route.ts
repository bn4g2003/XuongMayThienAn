import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await requirePermission('sales.orders', 'view');

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'list'; // 'list' or 'summary'

    // Parse filters
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const dateRangeFrom = searchParams.get('dateRange[from]');
    const dateRangeTo = searchParams.get('dateRange[to]');
    const branchId = searchParams.get('branch_id');
    const customerId = searchParams.get('customer_id');
    const current = parseInt(searchParams.get('current') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (current - 1) * pageSize;

    // Build where conditions for orders
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderWhereConditions: any = { status: 'COMPLETED' };

    if (startDate || endDate) {
      orderWhereConditions.order_date = {};
      if (startDate) {
        orderWhereConditions.order_date.gte = new Date(startDate);
      }
      if (endDate) {
        orderWhereConditions.order_date.lte = new Date(endDate);
      }
    } else if (dateRangeFrom || dateRangeTo) {
      // If no start/end date, use dateRange filter
      orderWhereConditions.order_date = {};
      if (dateRangeFrom) {
        orderWhereConditions.order_date.gte = new Date(dateRangeFrom);
      }
      if (dateRangeTo) {
        orderWhereConditions.order_date.lte = new Date(dateRangeTo);
      }
    }

    if (branchId) {
      orderWhereConditions.branch_id = parseInt(branchId);
    }

    if (customerId) {
      orderWhereConditions.customer_id = parseInt(customerId);
    }

    if (reportType === 'summary') {
      // Summary report
      const totalRevenue = await db.orders.aggregate({
        _sum: {
          final_amount: true
        },
        where: orderWhereConditions
      });

      const totalOrders = await db.orders.count({
        where: orderWhereConditions
      });

      const revenueByBranch = await db.orders.groupBy({
        by: ['branch_id'],
        _sum: {
          final_amount: true
        },
        _count: {
          id: true
        },
        where: orderWhereConditions,
        orderBy: {
          _sum: {
            final_amount: 'desc'
          }
        }
      });

      const revenueByCustomer = await db.orders.groupBy({
        by: ['customer_id'],
        _sum: {
          final_amount: true
        },
        _count: {
          id: true
        },
        where: orderWhereConditions,
        orderBy: {
          _sum: {
            final_amount: 'desc'
          }
        },
        take: 10 // Top 10 customers
      });

      // Get branch and customer names
      const branches = await db.branches.findMany({
        where: {
          id: {
            in: revenueByBranch.map(b => b.branch_id).filter(Boolean) as number[]
          }
        },
        select: {
          id: true,
          branch_name: true
        }
      });

      const customers = await db.customers.findMany({
        where: {
          id: {
            in: revenueByCustomer.map(c => c.customer_id).filter(Boolean) as number[]
          }
        },
        select: {
          id: true,
          customer_name: true
        }
      });

      const branchMap = Object.fromEntries(branches.map(b => [b.id, b.branch_name]));
      const customerMap = Object.fromEntries(customers.map(c => [c.id, c.customer_name]));

      return NextResponse.json({
        success: true,
        data: {
          totalRevenue: Number(totalRevenue._sum.final_amount || 0),
          totalOrders,
          revenueByBranch: revenueByBranch.map(b => ({
            branchName: branchMap[b.branch_id!] || 'Chưa phân loại',
            revenue: Number(b._sum.final_amount || 0),
            orders: b._count.id
          })),
          revenueByCustomer: revenueByCustomer.map(c => ({
            customerName: customerMap[c.customer_id!] || 'Chưa xác định',
            revenue: Number(c._sum.final_amount || 0),
            orders: c._count.id
          }))
        }
      });
    }

    // List report - detailed orders
    const total = await db.orders.count({
      where: orderWhereConditions
    });

    const orders = await db.orders.findMany({
      where: orderWhereConditions,
      include: {
        customers: {
          select: {
            customer_name: true,
            customer_code: true
          }
        },
        branches: {
          select: {
            branch_name: true
          }
        },
        users: {
          select: {
            username: true
          }
        },
        order_details: {
          include: {
            products: {
              select: {
                product_name: true,
                product_code: true
              }
            }
          }
        }
      },
      orderBy: {
        order_date: 'desc'
      },
      skip: offset,
      take: pageSize
    });

    const formattedOrders = orders.map(order => ({
      id: order.id,
      order_code: order.order_code,
      order_date: order.order_date,
      customer_name: order.customers?.customer_name || null,
      customer_code: order.customers?.customer_code || null,
      branch_name: order.branches?.branch_name || null,
      total_amount: Number(order.total_amount || 0),
      discount_amount: Number(order.discount_amount || 0),
      final_amount: Number(order.final_amount || 0),
      payment_status: order.payment_status,
      created_by: order.users?.username || null,
      products: order.order_details.map(detail => ({
        product_name: detail.products?.product_name || null,
        product_code: detail.products?.product_code || null,
        quantity: Number(detail.quantity),
        unit_price: Number(detail.unit_price),
        total_amount: Number(detail.total_amount)
      })),
      created_at: order.created_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        data: formattedOrders,
        total
      }
    });

  } catch (error) {
    console.error('Error generating revenue report:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
