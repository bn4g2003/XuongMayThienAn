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
        error: error || 'Không có quyền cập nhật sản xuất'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { step } = body;

    const validSteps = ['cutting', 'sewing', 'finishing', 'quality_check'];
    if (!validSteps.includes(step)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Bước sản xuất không hợp lệ'
      }, { status: 400 });
    }

    // Lấy production hiện tại
    const order = await db.orders.findUnique({
      where: { id: orderId },
      select: { production_status: true }
    });

    if (!order) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy đơn hàng'
      }, { status: 404 });
    }

    const currentProduction = (order.production_status as { cutting: boolean; sewing: boolean; finishing: boolean; quality_check: boolean; } | null) || {
      cutting: false,
      sewing: false,
      finishing: false,
      quality_check: false
    };

    // Toggle bước
    const stepKey = step as keyof typeof currentProduction;
    currentProduction[stepKey] = !currentProduction[stepKey];

    // Cập nhật
    await db.orders.update({
      where: { id: orderId },
      data: {
        production_status: currentProduction,
        updated_at: new Date()
      }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update production error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
