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

    await requirePermission('finance.debts', 'view');

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'list'; // 'list' or 'summary'

    // Parse filters
    const dateRangeFrom = searchParams.get('dateRange[from]');
    const dateRangeTo = searchParams.get('dateRange[to]');
    const search = searchParams.get('search');
    const branchId = searchParams.get('branch_id');
    const debtType = searchParams.get('debt_type'); // 'customer' or 'supplier'
    const status = searchParams.get('status');
    const current = parseInt(searchParams.get('current') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (current - 1) * pageSize;

    // Build where conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereConditions: any = {};

    // Date range filter
    if (dateRangeFrom || dateRangeTo) {
      whereConditions.created_at = {};
      if (dateRangeFrom) {
        whereConditions.created_at.gte = new Date(dateRangeFrom);
      }
      if (dateRangeTo) {
        whereConditions.created_at.lte = new Date(dateRangeTo);
      }
    }

    // Search filter
    if (search) {
      whereConditions.OR = [
        {
          customers: {
            customer_name: { contains: search, mode: 'insensitive' }
          }
        },
        {
          suppliers: {
            supplier_name: { contains: search, mode: 'insensitive' }
          }
        },
        { debt_code: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Branch filter - filter based on debt type
    if (branchId) {
      const branchIdNum = parseInt(branchId);
      const debtTypes = debtType ? debtType.split(',').filter(t => t.trim() !== '') : [];

      if (debtTypes.length === 1 && debtTypes[0] === 'CUSTOMER') {
        whereConditions.customers = { branch_id: branchIdNum };
      } else if (debtTypes.length === 1 && debtTypes[0] === 'SUPPLIER') {
        whereConditions.suppliers = { branch_id: branchIdNum };
      } else {
        // Multiple debt types or no specific type, check both
        const branchCondition = {
          OR: [
            { customers: { branch_id: branchIdNum } },
            { suppliers: { branch_id: branchIdNum } }
          ]
        };

        if (whereConditions.OR) {
          // Combine with existing OR from search
          whereConditions.AND = whereConditions.AND || [];
          whereConditions.AND.push(branchCondition);
        } else {
          Object.assign(whereConditions, branchCondition);
        }
      }
    }

    // Debt type filter - support multiple values separated by comma
    if (debtType && debtType.trim() !== '') {
      const debtTypes = debtType.split(',').filter(t => t.trim() !== '');
      if (debtTypes.length === 1) {
        whereConditions.debt_type = {
          equals: debtTypes[0],
          mode: 'insensitive'
        };
      } else if (debtTypes.length > 1) {
        whereConditions.debt_type = {
          in: debtTypes,
          mode: 'insensitive'
        };
      }
    }

    // Status filter
    if (status) {
      whereConditions.status = status;
    }

    if (reportType === 'summary') {
      // Summary statistics
      const totalDebts = await db.debt_management.count({
        where: whereConditions
      });

      const totalOriginalAmount = await db.debt_management.aggregate({
        _sum: { original_amount: true },
        where: whereConditions
      });

      const totalRemainingAmount = await db.debt_management.aggregate({
        _sum: { remaining_amount: true },
        where: whereConditions
      });

      const debtsByType = await db.debt_management.groupBy({
        by: ['debt_type'],
        _count: { id: true },
        _sum: { remaining_amount: true },
        where: whereConditions
      });

      const debtsByStatus = await db.debt_management.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { remaining_amount: true },
        where: whereConditions
      });

      const overdueDebts = await db.debt_management.count({
        where: {
          ...whereConditions,
          due_date: { lt: new Date() },
          status: { not: 'PAID' }
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          totalDebts,
          totalOriginalAmount: totalOriginalAmount._sum.original_amount || 0,
          totalRemainingAmount: totalRemainingAmount._sum.remaining_amount || 0,
          debtsByType: debtsByType.map(item => ({
            type: item.debt_type,
            count: item._count.id,
            amount: item._sum.remaining_amount || 0
          })),
          debtsByStatus: debtsByStatus.map(item => ({
            status: item.status,
            count: item._count.id,
            amount: item._sum.remaining_amount || 0
          })),
          overdueDebts
        }
      });
    } else {
      // List with pagination
      const debts = await db.debt_management.findMany({
        where: whereConditions,
        include: {
          customers: {
            select: {
              customer_code: true,
              customer_name: true,
              phone: true,
              branches: { select: { branch_name: true } }
            }
          },
          suppliers: {
            select: {
              supplier_code: true,
              supplier_name: true,
              phone: true,
              branches: { select: { branch_name: true } }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: pageSize
      });

      const total = await db.debt_management.count({
        where: whereConditions
      });

      const formattedDebts = debts.map(debt => ({
        id: debt.id,
        debt_code: debt.debt_code,
        debt_type: debt.debt_type,
        customer: debt.customers ? {
          code: debt.customers.customer_code,
          name: debt.customers.customer_name,
          phone: debt.customers.phone,
          branch: debt.customers.branches?.branch_name
        } : null,
        supplier: debt.suppliers ? {
          code: debt.suppliers.supplier_code,
          name: debt.suppliers.supplier_name,
          phone: debt.suppliers.phone,
          branch: debt.suppliers.branches?.branch_name
        } : null,
        original_amount: debt.original_amount,
        remaining_amount: debt.remaining_amount,
        due_date: debt.due_date,
        status: debt.status,
        created_at: debt.created_at
      }));

      return NextResponse.json({
        success: true,
        data: formattedDebts,
        pagination: {
          current,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      });
    }
  } catch (error) {
    console.error('Error fetching debt report:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
