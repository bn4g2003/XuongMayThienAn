import { db } from '@/lib/db';
// Prisma types not required here
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Kiểm tra quyền xem sản phẩm
    const { hasPermission, user: currentUser, error } = await requirePermission('products.products', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem sản phẩm'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build Prisma where clause: ADMIN sees all, others only their branch
    const whereClause: Record<string, unknown> = {};
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      whereClause.branch_id = currentUser.branchId;
    }

    const [productsRaw, total] = await Promise.all([
      db.products.findMany({
        where: whereClause,
        orderBy: { id: 'desc' },
        take: limit,
        skip: offset,
        include: {
          product_categories: { select: { category_name: true } },
          branches: { select: { branch_name: true } },
        },
      }),
      db.products.count({ where: whereClause }),
    ]);

    const products = productsRaw.map((p) => ({
      id: p.id,
      productCode: p.product_code,
      productName: p.product_name,
      categoryId: p.category_id ?? undefined,
      description: p.description ?? undefined,
      unit: p.unit,
      costPrice: p.cost_price !== null && p.cost_price !== undefined ? Number(p.cost_price) : undefined,
      isActive: p.is_active ?? true,
      branchId: p.branch_id ?? undefined,
      categoryName: p.product_categories?.category_name,
      branchName: p.branches?.branch_name,
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        products,
        total,
        page,
        limit,
      },
    });

  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền tạo sản phẩm
    const { hasPermission, user: currentUser, error } = await requirePermission('products.products', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo sản phẩm'
      }, { status: 403 });
    }

    const body = await request.json();
    const { productCode, productName, categoryId, description, unit, costPrice, bom } = body;

    if (!productCode || !productName || !unit) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    // Insert product
    const created = await db.products.create({
      data: {
        product_code: productCode,
        product_name: productName,
        category_id: categoryId ?? null,
        description: description ?? null,
        unit,
        cost_price: costPrice ?? 0,
        branch_id: currentUser.branchId ?? undefined,
      },
      select: { id: true, product_code: true, product_name: true },
    });

    const productId = created.id;

    // Insert BOM if provided
    if (bom && Array.isArray(bom) && bom.length > 0) {
      for (const item of bom) {
        await db.bom.create({
          data: {
            product_id: productId,
            material_id: item.materialId,
            quantity: item.quantity,
            unit: item.unit,
            notes: item.notes ?? null,
          },
        });
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: created.id,
        productCode: created.product_code,
        productName: created.product_name,
      },
      message: 'Tạo sản phẩm thành công',
    });

  } catch (error) {
    console.error('Create product error:', error);
    const e = error as { code?: string };
    if (e.code === '23505' || e.code === 'P2002') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã sản phẩm đã tồn tại',
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server',
    }, { status: 500 });
  }
}
