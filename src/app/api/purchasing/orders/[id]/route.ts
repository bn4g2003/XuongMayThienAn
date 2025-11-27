import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('purchasing.orders', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem đơn đặt hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const poId = parseInt(resolvedParams.id);

    // Lấy thông tin đơn đặt hàng
    const po = await db.purchase_orders.findUnique({
      where: { id: poId },
      include: {
        suppliers: true,
        users: true
      }
    });

    if (!po) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy đơn đặt hàng'
      }, { status: 404 });
    }

    const poData = {
      id: po.id,
      poCode: po.po_code,
      supplierName: po.suppliers?.supplier_name,
      supplierPhone: po.suppliers?.phone,
      supplierAddress: po.suppliers?.address,
      orderDate: po.order_date,
      expectedDate: po.expected_date,
      totalAmount: po.total_amount,
      status: po.status,
      notes: po.notes,
      createdBy: po.users?.full_name,
      createdAt: po.created_at
    };

    // Lấy chi tiết
    const details = await db.purchase_order_details.findMany({
      where: { purchase_order_id: poId },
      include: {
        materials: true
      },
      orderBy: { id: 'asc' }
    });

    const formattedDetails = details.map(detail => ({
      id: detail.id,
      itemCode: detail.item_code || detail.materials?.material_code,
      materialName: detail.item_name || detail.materials?.material_name,
      unit: detail.unit || detail.materials?.unit,
      quantity: detail.quantity,
      unitPrice: detail.unit_price,
      totalAmount: detail.total_amount,
      notes: detail.notes
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...poData,
        details: formattedDetails
      }
    });

  } catch (error) {
    console.error('Get purchase order detail error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
