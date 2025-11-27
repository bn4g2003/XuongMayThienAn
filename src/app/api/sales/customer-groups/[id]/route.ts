import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.customers', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem nhóm khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.id);

    const result = await db.customer_groups.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: { customers: true }
        }
      }
    });

    if (!result) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy nhóm khách hàng'
      }, { status: 404 });
    }

    // Transform the data to match the expected format
    const formattedResult = {
      id: result.id,
      groupCode: result.group_code,
      groupName: result.group_name,
      priceMultiplier: result.price_multiplier,
      description: result.description,
      createdAt: result.created_at,
      customerCount: result._count.customers
    };

    return NextResponse.json<ApiResponse>({
      success: true,
      data: formattedResult
    });

  } catch (error) {
    console.error('Get customer group error:', error);
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
    const { hasPermission, error } = await requirePermission('sales.customers', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa nhóm khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { groupName, priceMultiplier, description } = body;

    await db.customer_groups.update({
      where: { id: groupId },
      data: {
        group_name: groupName,
        price_multiplier: parseFloat(priceMultiplier),
        description: description || null
      }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update customer group error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.customers', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa nhóm khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.id);

    const customerCount = await db.customers.count({
      where: { customer_group_id: groupId }
    });

    if (customerCount > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa nhóm đã có khách hàng'
      }, { status: 400 });
    }

    await db.customer_groups.delete({
      where: { id: groupId }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa thành công'
    });

  } catch (error) {
    console.error('Delete customer group error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
