import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Kiểm tra quyền xem danh mục
    const { hasPermission, error } = await requirePermission('products.categories', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem danh mục'
      }, { status: 403 });
    }

    const categories = await db.product_categories.findMany({
      orderBy: { id: 'asc' }
    });

    // Get parent names separately
    const parentIds = categories
      .map(cat => cat.parent_id)
      .filter(id => id !== null) as number[];

    const parents = parentIds.length > 0
      ? await db.product_categories.findMany({
          where: { id: { in: parentIds } },
          select: { id: true, category_name: true }
        })
      : [];

    const parentMap = new Map(parents.map(p => [p.id, p.category_name]));

    const result = categories.map(category => ({
      id: category.id,
      categoryCode: category.category_code,
      categoryName: category.category_name,
      parentId: category.parent_id,
      description: category.description,
      parentName: category.parent_id ? parentMap.get(category.parent_id) : null
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền tạo danh mục
    const { hasPermission, error } = await requirePermission('products.categories', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo danh mục'
      }, { status: 403 });
    }

    const body = await request.json();
    const { categoryCode, categoryName, parentId, description } = body;

    if (!categoryCode || !categoryName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    const result = await db.product_categories.create({
      data: {
        category_code: categoryCode,
        category_name: categoryName,
        parent_id: parentId || null,
        description: description
      },
      select: {
        id: true,
        category_code: true,
        category_name: true
      }
    });

    const formattedResult = {
      id: result.id,
      categoryCode: result.category_code,
      categoryName: result.category_name
    };

    return NextResponse.json<ApiResponse>({
      success: true,
      data: formattedResult,
      message: 'Tạo danh mục thành công'
    });

  } catch (error: any) {
    console.error('Create category error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã danh mục đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
