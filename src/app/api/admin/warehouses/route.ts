import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Kiểm tra quyền xem warehouses
    const { hasPermission, user: currentUser, error } = await requirePermission('admin.warehouses', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem kho'
      }, { status: 403 });
    }

    // Data segregation
    const whereClause = currentUser.roleCode !== 'ADMIN'
      ? { branch_id: currentUser.branchId }
      : {};

    const result = await db.warehouses.findMany({
      where: whereClause,
      include: {
        branches: {
          select: {
            branch_name: true
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    // Transform data to match expected format
    const transformedResult = result.map(warehouse => ({
      id: warehouse.id,
      warehouseCode: warehouse.warehouse_code,
      warehouseName: warehouse.warehouse_name,
      branchId: warehouse.branch_id,
      address: warehouse.address,
      isActive: warehouse.is_active,
      warehouseType: warehouse.warehouse_type,
      branchName: warehouse.branches?.branch_name
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: transformedResult
    });

  } catch (error) {
    console.error('Get warehouses error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền tạo warehouse
    const { hasPermission, error } = await requirePermission('admin.warehouses', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo kho'
      }, { status: 403 });
    }

    const body = await request.json();
    const { warehouseCode, warehouseName, branchId, address, warehouseType } = body;

    if (!warehouseCode || !warehouseName || !branchId || !warehouseType) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    const result = await db.warehouses.create({
      data: {
        warehouse_code: warehouseCode,
        warehouse_name: warehouseName,
        branch_id: branchId,
        address: address,
        warehouse_type: warehouseType
      },
      select: {
        id: true,
        warehouse_code: true,
        warehouse_name: true,
        warehouse_type: true
      }
    });

    // Transform to match expected format
    const transformedResult = {
      id: result.id,
      warehouseCode: result.warehouse_code,
      warehouseName: result.warehouse_name,
      warehouseType: result.warehouse_type
    };

    return NextResponse.json<ApiResponse>({
      success: true,
      data: transformedResult,
      message: 'Tạo kho thành công'
    });

  } catch (error: any) {
    console.error('Create warehouse error:', error);
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã kho đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
