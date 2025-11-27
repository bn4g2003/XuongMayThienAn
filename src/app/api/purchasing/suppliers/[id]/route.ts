import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('purchasing.suppliers', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa nhà cung cấp'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const supplierId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { supplierName, phone, email, address, supplierGroupId } = body;

    await db.suppliers.update({
      where: { id: supplierId },
      data: {
        supplier_name: supplierName,
        phone: phone || null,
        email: email || null,
        address: address || null,
        supplier_group_id: supplierGroupId || null
      }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update supplier error:', error);
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
    const { hasPermission, error } = await requirePermission('purchasing.suppliers', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa nhà cung cấp'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const supplierId = parseInt(resolvedParams.id);

    const purchaseOrderCount = await db.purchase_orders.count({
      where: { supplier_id: supplierId }
    });

    if (purchaseOrderCount > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa nhà cung cấp đã có đơn đặt hàng'
      }, { status: 400 });
    }

    await db.suppliers.delete({
      where: { id: supplierId }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa thành công'
    });

  } catch (error) {
    console.error('Delete supplier error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
