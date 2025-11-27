import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const getPurchasingReportSchema = z.object({
  type: z.enum(['list', 'summary']).optional().default('list'),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().optional().default(10),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  supplierId: z.string().optional(), // comma-separated values
  branchId: z.string().optional(), // comma-separated values
  status: z.string().optional(), // comma-separated values
});

const purchasingReportsRouter = router({
  getReport: protectedProcedure
    .input(getPurchasingReportSchema)
    .query(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('purchasing.orders', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem báo cáo mua hàng');
      }

      const {
        type,
        page,
        pageSize,
        search,
        startDate,
        endDate,
        supplierId,
        branchId,
        status
      } = input;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whereClause: any = {};

      // Date range filter
      if (startDate || endDate) {
        whereClause.order_date = {};
        if (startDate) whereClause.order_date.gte = new Date(startDate);
        if (endDate) whereClause.order_date.lte = new Date(endDate);
      }

      // Supplier filter
      if (supplierId) {
        const supplierIds = supplierId.split(',').map(s => s.trim()).filter(Boolean);
        if (supplierIds.length > 0) {
          whereClause.supplier_id = supplierIds.length === 1
            ? parseInt(supplierIds[0])
            : { in: supplierIds.map(id => parseInt(id)) };
        }
      }

      // Branch filter
      if (branchId) {
        const branchIds = branchId.split(',').map(s => s.trim()).filter(Boolean);
        if (branchIds.length > 0) {
          whereClause.branch_id = branchIds.length === 1
            ? parseInt(branchIds[0])
            : { in: branchIds.map(id => parseInt(id)) };
        }
      }

      // Status filter
      if (status) {
        const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
        if (statuses.length > 0) {
          whereClause.status = statuses.length === 1
            ? { equals: statuses[0], mode: "insensitive" }
            : { in: statuses, mode: "insensitive" };
        }
      }

      // Search filter
      if (search) {
        whereClause.OR = [
          { purchase_order_code: { contains: search, mode: "insensitive" } },
          {
            suppliers: {
              supplier_name: { contains: search, mode: "insensitive" },
            },
          },
        ];
      }

      if (type === "summary") {
        // Summary statistics
        const totalOrders = await db.purchase_orders.count({ where: whereClause });
        const totalAmount = await db.purchase_orders.aggregate({
          where: whereClause,
          _sum: { total_amount: true },
        });

        const statusSummary = await db.purchase_orders.groupBy({
          by: ["status"],
          where: whereClause,
          _count: { id: true },
          _sum: { total_amount: true },
        });

        // Build monthly summary using Prisma aggregation
        const monthlyData = await db.purchase_orders.findMany({
          where: whereClause,
          select: {
            order_date: true,
            total_amount: true,
          },
        });

        // Group by month manually
        const monthlyMap = new Map<string, { month: string; order_count: number; total_amount: number }>();
        monthlyData.forEach(item => {
          const month = item.order_date.toISOString().slice(0, 7); // YYYY-MM
          if (!monthlyMap.has(month)) {
            monthlyMap.set(month, { month, order_count: 0, total_amount: 0 });
          }
          const existing = monthlyMap.get(month)!;
          existing.order_count += 1;
          existing.total_amount += Number(item.total_amount);
        });

        const monthlySummary = Array.from(monthlyMap.values())
          .sort((a, b) => b.month.localeCompare(a.month))
          .slice(0, 12);

        return {
          totalOrders,
          totalAmount: totalAmount._sum.total_amount || 0,
          statusSummary,
          monthlySummary,
        };
      }

      // List with pagination
      const orders = await db.purchase_orders.findMany({
        where: whereClause,
        include: {
          suppliers: {
            select: {
              supplier_name: true,
              supplier_code: true,
            },
          },
          branches: {
            select: {
              branch_name: true,
              branch_code: true,
            },
          },
          users: {
            select: {
              username: true,
              full_name: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const total = await db.purchase_orders.count({ where: whereClause });

      return {
        data: orders,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),
});

export default purchasingReportsRouter;