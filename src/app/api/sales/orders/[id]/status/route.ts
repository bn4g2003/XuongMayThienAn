import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.orders', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền cập nhật đơn hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'WAITING_MATERIAL', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Trạng thái không hợp lệ: ' + status
      }, { status: 400 });
    }

    // Nếu chuyển sang IN_PRODUCTION, khởi tạo production_status
    const order = await db.orders.findUnique({
      where: { id: orderId },
      select: { production_status: true }
    });

    const updateData: any = {
      status,
      updated_at: new Date()
    };

    if (status === 'IN_PRODUCTION') {
      updateData.production_status = order?.production_status || {
        cutting: false,
        sewing: false,
        finishing: false,
        quality_check: false
      };
    }

    await db.orders.update({
      where: { id: orderId },
      data: updateData
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật trạng thái thành công'
    });

  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
