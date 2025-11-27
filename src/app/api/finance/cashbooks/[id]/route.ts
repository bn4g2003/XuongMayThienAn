import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// DELETE - Xóa phiếu thu/chi
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, error } = await requirePermission('finance.cashbooks', 'delete');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Lấy thông tin phiếu trước khi xóa để hoàn trả số dư
    const cashbookData = await db.cash_books.findUnique({
      where: { id: parseInt(id) },
      select: {
        transaction_type: true,
        amount: true,
        bank_account_id: true
      }
    });

    if (!cashbookData) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy phiếu thu/chi' },
        { status: 404 }
      );
    }

    const { transaction_type: transactionType, amount, bank_account_id: bankAccountId } = cashbookData;

    // Xóa phiếu
    await db.cash_books.delete({
      where: { id: parseInt(id) }
    });

    // Hoàn trả số dư tài khoản ngân hàng nếu có
    if (bankAccountId) {
      const balanceChange = transactionType === 'THU' ? -amount : amount;
      await db.bank_accounts.update({
        where: { id: bankAccountId },
        data: {
          balance: {
            increment: balanceChange
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Xóa phiếu thu/chi thành công',
    });
  } catch (error: unknown) {
    console.error('Error deleting cash book:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
