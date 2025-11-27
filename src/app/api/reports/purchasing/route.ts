import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function parseMultiValue(param?: string | string[]) {
  if (!param) return [];

  if (Array.isArray(param)) {
    return param
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return param
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") || "list";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const supplierId = searchParams.get("supplierId");
    const branchId = searchParams.get("branchId");
    const status = searchParams.get("status");

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
      const supplierIds = parseMultiValue(supplierId);
      if (supplierIds.length > 0) {
        whereClause.supplier_id = supplierIds.length === 1
          ? parseInt(supplierIds[0])
          : { in: supplierIds.map(id => parseInt(id)) };
      }
    }

    // Branch filter
    if (branchId) {
      const branchIds = parseMultiValue(branchId);
      if (branchIds.length > 0) {
        whereClause.branch_id = branchIds.length === 1
          ? parseInt(branchIds[0])
          : { in: branchIds.map(id => parseInt(id)) };
      }
    }

    // Status filter
    if (status) {
      const statuses = parseMultiValue(status);
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

      return NextResponse.json({
        success: true,
        data: {
          totalOrders,
          totalAmount: totalAmount._sum.total_amount || 0,
          statusSummary,
          monthlySummary,
        },
      });
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

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching purchasing reports:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
