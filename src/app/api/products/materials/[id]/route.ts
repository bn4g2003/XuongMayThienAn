import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền sửa nguyên vật liệu
    const { hasPermission, error } = await requirePermission('products.materials', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa nguyên vật liệu'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { materialName, unit, description } = body;

    try {
      const result = await db.materials.update({
        where: { id: parseInt(id) },
        data: {
          material_name: materialName,
          unit: unit,
          description: description
        },
        select: {
          id: true,
          material_code: true,
          material_name: true
        }
      });

      const formattedResult = {
        id: result.id,
        materialCode: result.material_code,
        materialName: result.material_name
      };

      return NextResponse.json<ApiResponse>({
        success: true,
        data: formattedResult,
        message: 'Cập nhật NVL thành công'
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Không tìm thấy NVL'
        }, { status: 404 });
      }
      throw error;
    }

  } catch (error) {
    console.error('Update material error:', error);
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
    // Kiểm tra quyền xóa nguyên vật liệu
    const { hasPermission, error } = await requirePermission('products.materials', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa nguyên vật liệu'
      }, { status: 403 });
    }

    const { id } = await params;

    // Kiểm tra xem NVL có đang được dùng trong BOM không
    const bomCount = await db.bom.count({
      where: { material_id: parseInt(id) }
    });

    if (bomCount > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa NVL đang được sử dụng trong định mức sản phẩm'
      }, { status: 400 });
    }

    try {
      await db.materials.delete({
        where: { id: parseInt(id) }
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'Xóa NVL thành công'
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Không tìm thấy NVL'
        }, { status: 404 });
      }
      throw error;
    }

  } catch (error) {
    console.error('Delete material error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
