import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền xem sản phẩm
    const { hasPermission, error } = await requirePermission('products.products', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem sản phẩm'
      }, { status: 403 });
    }

    const { id } = await params;
    const idNum = parseInt(id, 10);

    const p = await db.products.findUnique({
      where: { id: idNum },
      include: {
        product_categories: { select: { category_name: true } },
        branches: { select: { branch_name: true } },
      },
    });

    if (!p) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Không tìm thấy sản phẩm' }, { status: 404 });
    }

    const product = {
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
    };

    return NextResponse.json<ApiResponse>({ success: true, data: product });

  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền sửa sản phẩm
    const { hasPermission, error } = await requirePermission('products.products', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa sản phẩm'
      }, { status: 403 });
    }

    const { id } = await params;
    const idNum = parseInt(id, 10);
    const body = await request.json();
    const { productName, categoryId, description, unit, costPrice, bom } = body;

    const existing = await db.products.findUnique({ where: { id: idNum } });
    if (!existing) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Không tìm thấy sản phẩm' }, { status: 404 });
    }

    // Update product
    const updated = await db.products.update({
      where: { id: idNum },
      data: {
        product_name: productName,
        category_id: categoryId ?? null,
        description: description ?? null,
        unit,
        cost_price: costPrice ?? null,
      },
      select: { id: true, product_code: true, product_name: true },
    });

    // Update BOM: delete existing then insert new
    await db.bom.deleteMany({ where: { product_id: idNum } });

    if (bom && Array.isArray(bom) && bom.length > 0) {
      for (const item of bom) {
        await db.bom.create({ data: {
          product_id: idNum,
          material_id: item.materialId,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes ?? null,
        } });
      }
    }

    return NextResponse.json<ApiResponse>({ success: true, data: {
      id: updated.id,
      productCode: updated.product_code,
      productName: updated.product_name,
    }, message: 'Cập nhật sản phẩm thành công' });

  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền xóa sản phẩm
    const { hasPermission, error } = await requirePermission('products.products', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa sản phẩm'
      }, { status: 403 });
    }

    const { id } = await params;
    const idNum = parseInt(id, 10);

    // Delete BOM first
    await db.bom.deleteMany({ where: { product_id: idNum } });

    // Delete product
    await db.products.delete({ where: { id: idNum } });

    return NextResponse.json<ApiResponse>({ success: true, message: 'Xóa sản phẩm thành công' });

  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
