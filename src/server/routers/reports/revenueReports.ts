import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const getRevenueReportSchema = z.object({
  type: z.enum(['list', 'summary']).optional().default('list'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dateRangeFrom: z.string().optional(),
  dateRangeTo: z.string().optional(),
  branchId: z.number().int().positive().optional(),
  customerId: z.number().int().positive().optional(),
  current: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().optional().default(10),
});

const revenueReportsRouter = router({
  getReport: protectedProcedure
    .input(getRevenueReportSchema)
    .query(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('sales.orders', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem báo cáo doanh thu');
      }

      const {
        type,
        startDate,
        endDate,
        dateRangeFrom,
        dateRangeTo,
        branchId,
        customerId,
        current,
        pageSize
      } = input;

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
        orderWhereConditions.branch_id = branchId;
      }

      if (customerId) {
        orderWhereConditions.customer_id = customerId;
      }

      if (type === 'summary') {
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

        return {
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
        };
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

      return {
        data: formattedOrders,
        total
      };
    }),
});

export default revenueReportsRouter;