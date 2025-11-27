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
        error: error || 'Không có quyền duyệt phiếu'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const transactionId = parseInt(resolvedParams.id);

    // Kiểm tra phiếu
    const transaction = await db.inventory_transactions.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        status: true,
        from_warehouse_id: true
      }
    });

    if (!transaction) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy phiếu'
      }, { status: 404 });
    }

    if (transaction.status !== 'PENDING') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Phiếu không ở trạng thái chờ duyệt'
      }, { status: 400 });
    }

    const fromWarehouseId = transaction.from_warehouse_id;

    // Lấy chi tiết và kiểm tra/cập nhật tồn kho trong transaction
    await db.$transaction(async (tx) => {
      const details = await tx.inventory_transaction_details.findMany({
        where: { transaction_id: transactionId },
        select: {
          product_id: true,
          material_id: true,
          quantity: true
        }
      });

      // Trừ tồn kho cho từng item
      for (const item of details) {
        const existingBalance = await tx.inventory_balances.findFirst({
          where: {
            warehouse_id: fromWarehouseId,
            product_id: item.product_id,
            material_id: item.material_id
          },
          select: {
            id: true,
            quantity: true
          }
        });

        if (!existingBalance) {
          throw new Error('Không tìm thấy tồn kho');
        }

        if (Number(existingBalance.quantity) < Number(item.quantity)) {
          throw new Error('Số lượng tồn kho không đủ');
        }

        // Trừ tồn kho
        await tx.inventory_balances.update({
          where: { id: existingBalance.id },
          data: {
            quantity: {
              decrement: Number(item.quantity)
            },
            last_updated: new Date()
          }
        });
      }

      // Cập nhật trạng thái
      await tx.inventory_transactions.update({
        where: { id: transactionId },
        data: {
          status: 'APPROVED',
          approved_by: currentUser.id,
          approved_at: new Date()
        }
      });
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Duyệt phiếu xuất kho thành công'
    });

  } catch (error) {
    console.error('Approve export error:', error);

    // Handle transaction errors
    if (error instanceof Error) {
      if (error.message === 'Không tìm thấy tồn kho') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Không tìm thấy tồn kho'
        }, { status: 400 });
      }
      if (error.message === 'Số lượng tồn kho không đủ') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Số lượng tồn kho không đủ'
        }, { status: 400 });
      }
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
