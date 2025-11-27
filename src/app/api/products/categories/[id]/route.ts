import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền sửa danh mục
    const { hasPermission, error } = await requirePermission('products.categories', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa danh mục'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { categoryName, parentId, description } = body;

    try {
      const result = await db.product_categories.update({
        where: { id: parseInt(id) },
        data: {
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
        message: 'Cập nhật danh mục thành công'
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Không tìm thấy danh mục'
        }, { status: 404 });
      }
      throw error;
    }

  } catch (error) {
    console.error('Update category error:', error);
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
    // Kiểm tra quyền xóa danh mục
    const { hasPermission, error } = await requirePermission('products.categories', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa danh mục'
      }, { status: 403 });
    }

    const { id } = await params;

    // Kiểm tra xem có sản phẩm nào đang dùng danh mục này không
    const productCount = await db.products.count({
      where: { category_id: parseInt(id) }
    });

    if (productCount > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa danh mục đang có sản phẩm'
      }, { status: 400 });
    }

    try {
      await db.product_categories.delete({
        where: { id: parseInt(id) }
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'Xóa danh mục thành công'
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Không tìm thấy danh mục'
        }, { status: 404 });
      }
      throw error;
    }

  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
