import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { hasPermission, error } = await requirePermission('purchasing.suppliers', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem nhóm NCC'
      }, { status: 403 });
    }

    const result = await db.supplier_groups.findMany({
      select: {
        id: true,
        group_code: true,
        group_name: true,
        description: true
      },
      orderBy: {
        group_name: 'asc'
      }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get supplier groups error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, error } = await requirePermission('purchasing.suppliers', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo nhóm NCC'
      }, { status: 403 });
    }

    const body = await request.json();
    const { groupCode, groupName, description } = body;

    const existingGroup = await db.supplier_groups.findFirst({
      where: { group_code: groupCode }
    });

    if (existingGroup) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã nhóm đã tồn tại'
      }, { status: 400 });
    }

    const result = await db.supplier_groups.create({
      data: {
        group_code: groupCode,
        group_name: groupName,
        description: description || null
      },
      select: { id: true }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: result.id }
    });

  } catch (error) {
    console.error('Create supplier group error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
