import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// PUT - Cập nhật danh mục tài chính
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, error } = await requirePermission('finance.categories', 'edit');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { categoryName, type, description, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (categoryName !== undefined) updateData.category_name = categoryName;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.is_active = isActive;

    const updatedCategory = await db.financial_categories.update({
      where: { id: parseInt(id) },
      data: updateData,
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
      id: updatedCategory.id,
      categoryCode: updatedCategory.category_code,
      categoryName: updatedCategory.category_name,
      type: updatedCategory.type,
      description: updatedCategory.description,
      isActive: updatedCategory.is_active,
      createdAt: updatedCategory.created_at
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy danh mục' },
        { status: 404 }
      );
    }

    console.error('Error updating financial category:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Xóa danh mục tài chính
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, error } = await requirePermission('finance.categories', 'delete');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  const { id } = await params;

  try {
    await db.financial_categories.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({
      success: true,
      message: 'Xóa danh mục thành công',
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy danh mục' },
        { status: 404 }
      );
    }

    console.error('Error deleting financial category:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
