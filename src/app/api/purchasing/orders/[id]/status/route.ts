import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('purchasing.orders', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền cập nhật đơn đặt hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const poId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Trạng thái không hợp lệ: ' + status
      }, { status: 400 });
    }

    try {
      await db.purchase_orders.update({
        where: { id: poId },
        data: { status: status }
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'Cập nhật trạng thái thành công'
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Không tìm thấy đơn đặt hàng'
        }, { status: 404 });
      }
      throw error;
    }

  } catch (error) {
    console.error('Update purchase order status error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
