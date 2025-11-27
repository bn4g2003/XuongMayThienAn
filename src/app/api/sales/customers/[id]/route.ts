import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.customers', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const customerId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { customerName, phone, email, address, customerGroupId, isActive } = body;

    await db.customers.update({
      where: { id: customerId },
      data: {
        customer_name: customerName,
        phone: phone || null,
        email: email || null,
        address: address || null,
        customer_group_id: customerGroupId || null,
        is_active: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update customer error:', error);
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
        error: error || 'Không có quyền xóa khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const customerId = parseInt(resolvedParams.id);

    // Kiểm tra có đơn hàng không
    const order = await db.orders.findFirst({
      where: { customer_id: customerId }
    });

    if (order) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa khách hàng đã có đơn hàng'
      }, { status: 400 });
    }

    await db.customers.delete({
      where: { id: customerId }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa thành công'
    });

  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
