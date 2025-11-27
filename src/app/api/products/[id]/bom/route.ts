import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền xem BOM (định mức)
    const { hasPermission, error } = await requirePermission('products.bom', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem định mức sản phẩm'
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await db.bom.findMany({
      where: {
        product_id: parseInt(id)
      },
      include: {
        materials: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    const formattedResult = result.map(bom => ({
      id: bom.id,
      materialId: bom.material_id,
      quantity: bom.quantity,
      unit: bom.unit,
      notes: bom.notes,
      materialName: bom.materials?.material_name
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: formattedResult
    });

  } catch (error) {
    console.error('Get BOM error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
