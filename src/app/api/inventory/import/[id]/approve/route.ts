import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.import', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền duyệt phiếu'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const transactionId = parseInt(resolvedParams.id);

    // Kiểm tra phiếu tồn tại và đang ở trạng thái PENDING
    const trans = await db.inventory_transactions.findUnique({
      where: { id: transactionId },
      select: { id: true, status: true, to_warehouse_id: true }
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
        error: 'Phiếu không ở trạng thái chờ duyệt'
      }, { status: 400 });
    }

    const toWarehouseId = trans.to_warehouse_id;

    // Lấy chi tiết phiếu
    const details = await db.inventory_transaction_details.findMany({
      where: { transaction_id: transactionId },
      select: { product_id: true, material_id: true, quantity: true }
    });

    // Cập nhật tồn kho và trạng thái phiếu
    await db.$transaction(async (tx) => {
      // Cập nhật tồn kho
      for (const item of details) {
        const existingBalance = await tx.inventory_balances.findFirst({
          where: {
            warehouse_id: toWarehouseId,
            product_id: item.product_id,
            material_id: item.material_id
          },
          select: { id: true, quantity: true }
        });

        if (existingBalance) {
          // Cộng thêm vào tồn kho
          await tx.inventory_balances.update({
            where: { id: existingBalance.id },
            data: {
              quantity: { increment: item.quantity },
              last_updated: new Date()
            }
          });
        } else {
          // Tạo mới
          await tx.inventory_balances.create({
            data: {
              warehouse_id: toWarehouseId,
              product_id: item.product_id,
              material_id: item.material_id,
              quantity: item.quantity
            }
          });
        }
      }

      // Cập nhật trạng thái phiếu
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
      message: 'Duyệt phiếu nhập kho thành công'
    });

  } catch (error) {
    console.error('Approve import error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
