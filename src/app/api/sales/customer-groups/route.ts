import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { hasPermission, error } = await requirePermission('sales.customers', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem nhóm khách hàng'
      }, { status: 403 });
    }

    const result = await db.customer_groups.findMany({
      include: {
        _count: {
          select: { customers: true }
        }
      },
      orderBy: {
        group_name: 'asc'
      }
    });

    // Transform the data to match the expected format
    const formattedResult = result.map(group => ({
      id: group.id,
      groupCode: group.group_code,
      groupName: group.group_name,
      priceMultiplier: group.price_multiplier,
      description: group.description,
      createdAt: group.created_at,
      customerCount: group._count.customers
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: formattedResult
    });

  } catch (error) {
    console.error('Get customer groups error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, error } = await requirePermission('sales.customers', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo nhóm khách hàng'
      }, { status: 403 });
    }

    const body = await request.json();
    const { groupCode, groupName, priceMultiplier, description } = body;

    const existingGroup = await db.customer_groups.findFirst({
      where: { group_code: groupCode }
    });

    if (existingGroup) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã nhóm đã tồn tại'
      }, { status: 400 });
    }

    const result = await db.customer_groups.create({
      data: {
        group_code: groupCode,
        group_name: groupName,
        price_multiplier: parseFloat(priceMultiplier),
        description: description || null
      },
      select: { id: true }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: result.id }
    });

  } catch (error) {
    console.error('Create customer group error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
