import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Kiểm tra quyền xem nguyên vật liệu
    const { hasPermission, user: currentUser, error } = await requirePermission('products.materials', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem nguyên vật liệu'
      }, { status: 403 });
    }

    // Data segregation
    const where: any = {};
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      where.branch_id = currentUser.branchId;
    }

    const result = await db.materials.findMany({
      where,
      include: {
        branches: true
      },
      orderBy: { id: 'desc' }
    });

    const formattedResult = result.map(material => ({
      id: material.id,
      materialCode: material.material_code,
      materialName: material.material_name,
      unit: material.unit,
      description: material.description,
      branchId: material.branch_id,
      branchName: material.branches?.branch_name
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: formattedResult
    });

  } catch (error) {
    console.error('Get materials error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền tạo nguyên vật liệu
    const { hasPermission, user: currentUser, error } = await requirePermission('products.materials', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo nguyên vật liệu'
      }, { status: 403 });
    }

    const body = await request.json();
    const { materialCode, materialName, unit, description } = body;

    if (!materialCode || !materialName || !unit) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    const result = await db.materials.create({
      data: {
        material_code: materialCode,
        material_name: materialName,
        unit: unit,
        description: description,
        branch_id: currentUser.branchId
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
      message: 'Tạo nguyên vật liệu thành công'
    });

  } catch (error: any) {
    console.error('Create material error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã NVL đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
