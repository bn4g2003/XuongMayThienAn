import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.export', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền hủy phiếu'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const transactionId = parseInt(resolvedParams.id);

    // Kiểm tra phiếu
    const trans = await db.inventory_transactions.findUnique({
      where: { id: transactionId },
      select: { id: true, status: true }
    });

    if (!trans) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy phiếu'
      }, { status: 404 });
    }

    if (trans.status !== 'PENDING') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Chỉ có thể hủy phiếu đang chờ duyệt'
      }, { status: 400 });
    }

    // Cập nhật trạng thái thành CANCELLED
    await db.inventory_transactions.update({
      where: { id: transactionId },
      data: {
        status: 'CANCELLED',
        approved_by: currentUser.id,
        approved_at: new Date()
      }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Đã hủy phiếu'
    });

  } catch (error) {
    console.error('Reject export error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
