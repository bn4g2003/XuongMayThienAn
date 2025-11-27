import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const getCustomerReportSchema = z.object({
  type: z.enum(['list', 'summary']).optional().default('list'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dateRangeFrom: z.string().optional(),
  dateRangeTo: z.string().optional(),
  search: z.string().optional(),
  branchId: z.number().int().positive().optional(),
  customerGroupId: z.number().int().positive().optional(),
  current: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().optional().default(10),
});

const customerReportsRouter = router({
  getReport: protectedProcedure
    .input(getCustomerReportSchema)
    .query(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('sales.customers', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem báo cáo khách hàng');
      }

      const {
        type,
        startDate,
        endDate,
        dateRangeFrom,
        dateRangeTo,
        search,
        branchId,
        customerGroupId,
        current,
        pageSize
      } = input;

      const offset = (current - 1) * pageSize;

      // Build where conditions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whereConditions: any = { is_active: true };

      // Handle date filtering - prioritize start_date/end_date over dateRange
      if (startDate || endDate) {
        whereConditions.created_at = {};
        if (startDate) {
          whereConditions.created_at.gte = new Date(startDate);
        }
        if (endDate) {
          whereConditions.created_at.lte = new Date(endDate);
        }
      } else if (dateRangeFrom || dateRangeTo) {
        // If no start/end date, use dateRange filter
        whereConditions.created_at = {};
        if (dateRangeFrom) {
          whereConditions.created_at.gte = new Date(dateRangeFrom);
        }
        if (dateRangeTo) {
          whereConditions.created_at.lte = new Date(dateRangeTo);
        }
      }

      if (branchId) {
        whereConditions.branch_id = branchId;
      }

      if (customerGroupId) {
        whereConditions.customer_group_id = customerGroupId;
      }

      if (search) {
        whereConditions.OR = [
          { customer_name: { contains: search, mode: 'insensitive' } },
          { customer_code: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (type === 'summary') {
        // Summary report
        const totalCustomers = await db.customers.count({
          where: whereConditions
        });

        const totalDebt = await db.customers.aggregate({
          _sum: {
            debt_amount: true
          },
          where: whereConditions
        });

        const customersByGroup = await db.customers.groupBy({
          by: ['customer_group_id'],
          _count: {
            id: true
          },
          where: whereConditions,
          orderBy: {
            _count: {
              id: 'desc'
            }
          }
        });

        const customersByBranch = await db.customers.groupBy({
          by: ['branch_id'],
          _count: {
            id: true
          },
          where: whereConditions,
          orderBy: {
            _count: {
              id: 'desc'
            }
          }
        });

        // Get group and branch names
        const groups = await db.customer_groups.findMany({
          where: {
            id: {
              in: customersByGroup.map(g => g.customer_group_id).filter(Boolean) as number[]
            }
          },
          select: {
            id: true,
            group_name: true
          }
        });

        const branches = await db.branches.findMany({
          where: {
            id: {
              in: customersByBranch.map(b => b.branch_id).filter(Boolean) as number[]
            }
          },
          select: {
            id: true,
            branch_name: true
          }
        });

        const groupMap = Object.fromEntries(groups.map(g => [g.id, g.group_name]));
        const branchMap = Object.fromEntries(branches.map(b => [b.id, b.branch_name]));

        return {
          totalCustomers,
          totalDebt: Number(totalDebt._sum.debt_amount || 0),
          customersByGroup: customersByGroup.map(g => ({
            groupName: groupMap[g.customer_group_id!] || 'Chưa phân loại',
            count: g._count.id
          })),
          customersByBranch: customersByBranch.map(b => ({
            branchName: branchMap[b.branch_id!] || 'Chưa phân loại',
            count: b._count.id
          }))
        };
      }

      // List report - default
      const total = await db.customers.count({
        where: whereConditions
      });

      const customers = await db.customers.findMany({
        where: whereConditions,
        include: {
          customer_groups: {
            select: {
              group_name: true,
              price_multiplier: true
            }
          },
          branches: {
            select: {
              branch_name: true
            }
          },
          orders: {
            select: {
              id: true,
              total_amount: true,
              order_date: true
            },
            orderBy: {
              order_date: 'desc'
            },
            take: 5 // Last 5 orders
          },
          debt_management: {
            select: {
              remaining_amount: true,
              status: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip: offset,
        take: pageSize
      });

      const formattedCustomers = customers.map(customer => ({
        id: customer.id,
        customer_code: customer.customer_code,
        customer_name: customer.customer_name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        group_name: customer.customer_groups?.group_name || null,
        price_multiplier: Number(customer.customer_groups?.price_multiplier || 1),
        branch_name: customer.branches?.branch_name || null,
        debt_amount: Number(customer.debt_amount || 0),
        total_orders: customer.orders.length,
        last_order_date: customer.orders[0]?.order_date || null,
        total_order_value: customer.orders.reduce((sum, order) => sum + Number(order.total_amount), 0),
        active_debts: customer.debt_management.filter(d => d.status === 'PENDING').length,
        total_debt_remaining: customer.debt_management.reduce((sum, debt) => sum + Number(debt.remaining_amount), 0),
        created_at: customer.created_at
      }));

      return {
        data: formattedCustomers,
        total
      };
    }),
});

export default customerReportsRouter;