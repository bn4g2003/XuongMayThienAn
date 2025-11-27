import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy danh sách danh mục tài chính
export async function GET(request: NextRequest) {
  const { hasPermission, error } = await requirePermission('finance.categories', 'view');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // THU hoặc CHI
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = {};

    if (type) {
      where.type = type;
    }

    if (isActive !== null && isActive !== undefined) {
      where.is_active = isActive === 'true';
    }

    const categories = await db.financial_categories.findMany({
      where,
      select: {
        id: true,
        category_code: true,
        category_name: true,
        type: true,
        description: true,
        is_active: true,
        created_at: true
      },
      orderBy: [
        { type: 'asc' },
        { category_name: 'asc' }
      ]
    });

    const data = categories.map(cat => ({
      id: cat.id,
      categoryCode: cat.category_code,
      categoryName: cat.category_name,
      type: cat.type,
      description: cat.description,
      isActive: cat.is_active,
      createdAt: cat.created_at
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error('Error fetching financial categories:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Tạo danh mục tài chính mới
export async function POST(request: NextRequest) {
  const { hasPermission, error } = await requirePermission('finance.categories', 'create');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { categoryCode, categoryName, type, description } = body;

    // Validate
    if (!categoryCode || !categoryName || !type) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    if (!['THU', 'CHI'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Loại danh mục không hợp lệ (THU hoặc CHI)' },
        { status: 400 }
      );
    }

    const newCategory = await db.financial_categories.create({
      data: {
        category_code: categoryCode,
        category_name: categoryName,
        type,
        description
      },
      select: {
        id: true,
        category_code: true,
        category_name: true,
        type: true,
        description: true,
        is_active: true,
        created_at: true
      }
    });

    const data = {
      id: newCategory.id,
      categoryCode: newCategory.category_code,
      categoryName: newCategory.category_name,
      type: newCategory.type,
      description: newCategory.description,
      isActive: newCategory.is_active,
      createdAt: newCategory.created_at
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error('Error creating financial category:', error);

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Mã danh mục đã tồn tại' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
