import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// POST - Thanh toán cho đơn hàng
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { hasPermission, user, error } = await requirePermission('finance.debts', 'edit');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { paymentAmount, paymentDate, paymentMethod, bankAccountId, notes, orderType } = body;

    // Validate
    if (!paymentAmount || !paymentDate || !paymentMethod || !orderType) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    if (!['order', 'purchase_order'].includes(orderType)) {
      return NextResponse.json(
        { success: false, error: 'orderType phải là order hoặc purchase_order' },
        { status: 400 }
      );
    }

    // Lấy thông tin đơn hàng
    let orderData: { amount: number; paidAmount: number; remainingAmount: number } | null = null;
    if (orderType === 'order') {
      const order = await db.orders.findUnique({
        where: { id: parseInt(id) },
        select: {
          final_amount: true,
          paid_amount: true
        }
      });
      if (order) {
        orderData = {
          amount: Number(order.final_amount),
          paidAmount: Number(order.paid_amount || 0),
          remainingAmount: Number(order.final_amount) - Number(order.paid_amount || 0)
        };
      }
    } else {
      const order = await db.purchase_orders.findUnique({
        where: { id: parseInt(id) },
        select: {
          total_amount: true,
          paid_amount: true
        }
      });
      if (order) {
        orderData = {
          amount: Number(order.total_amount),
          paidAmount: Number(order.paid_amount || 0),
          remainingAmount: Number(order.total_amount) - Number(order.paid_amount || 0)
        };
      }
    }

    if (!orderData) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    if (paymentAmount > orderData.remainingAmount) {
      return NextResponse.json(
        { success: false, error: 'Số tiền thanh toán vượt quá số tiền còn lại' },
        { status: 400 }
      );
    }

    // Cập nhật paid_amount của đơn hàng
    const newPaidAmount = orderData.paidAmount + paymentAmount;
    const newRemainingAmount = orderData.amount - newPaidAmount;

    let newPaymentStatus = 'PARTIAL';
    if (newRemainingAmount === 0) {
      newPaymentStatus = 'PAID';
    } else if (newPaidAmount === 0) {
      newPaymentStatus = 'UNPAID';
    }

    if (orderType === 'order') {
      await db.orders.update({
        where: { id: parseInt(id) },
        data: {
          paid_amount: newPaidAmount,
          payment_status: newPaymentStatus
        }
      });
    } else {
      await db.purchase_orders.update({
        where: { id: parseInt(id) },
        data: {
          paid_amount: newPaidAmount,
          payment_status: newPaymentStatus
        }
      });
    }

    const transactionType = orderType === 'order' ? 'THU' : 'CHI';

    // Cập nhật số dư tài khoản ngân hàng nếu có
    if (bankAccountId) {
      const balanceChange = transactionType === 'THU' ? paymentAmount : -paymentAmount;
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
      data: {
        newPaidAmount,
        newRemainingAmount,
        newPaymentStatus,
      },
    });
  } catch (error: unknown) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
