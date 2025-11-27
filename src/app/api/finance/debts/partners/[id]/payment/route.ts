import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// POST - Thanh toán công nợ cho khách hàng hoặc nhà cung cấp
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { hasPermission, error } = await requirePermission('finance.debts', 'edit');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { paymentAmount, paymentDate, paymentMethod, bankAccountId, partnerType } = body;

    // Validate
    if (!paymentAmount || !paymentDate || !paymentMethod || !partnerType) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    if (!['customer', 'supplier'].includes(partnerType)) {
      return NextResponse.json(
        { success: false, error: 'partnerType phải là customer hoặc supplier' },
        { status: 400 }
      );
    }

    const amount = parseFloat(paymentAmount);
    const transactionType = partnerType === 'customer' ? 'THU' : 'CHI';

    // Lấy thông tin khách hàng/nhà cung cấp
    let partner: { name: string; code: string } | null = null;
    if (partnerType === 'customer') {
      const customer = await db.customers.findUnique({
        where: { id: parseInt(id) },
        select: {
          customer_name: true,
          customer_code: true
        }
      });
      if (customer) {
        partner = {
          name: customer.customer_name,
          code: customer.customer_code
        };
      }
    } else {
      const supplier = await db.suppliers.findUnique({
        where: { id: parseInt(id) },
        select: {
          supplier_name: true,
          supplier_code: true
        }
      });
      if (supplier) {
        partner = {
          name: supplier.supplier_name,
          code: supplier.supplier_code
        };
      }
    }

    if (!partner) {
      return NextResponse.json(
        { success: false, error: `Không tìm thấy ${partnerType === 'customer' ? 'khách hàng' : 'nhà cung cấp'}` },
        { status: 404 }
      );
    }

    // Lấy danh sách đơn hàng chưa thanh toán đủ (theo thứ tự cũ nhất trước)
    let orders;
    if (partnerType === 'customer') {
      orders = await db.orders.findMany({
        where: {
          customer_id: parseInt(id),
          status: { not: 'CANCELLED' },
          final_amount: { gt: db.orders.fields.paid_amount }
        },
        select: {
          id: true,
          final_amount: true,
          paid_amount: true
        },
        orderBy: { created_at: 'asc' }
      });
      orders = orders.map(order => ({
        id: order.id,
        amount: Number(order.final_amount),
        paidAmount: Number(order.paid_amount || 0),
        remainingAmount: Number(order.final_amount) - Number(order.paid_amount || 0)
      }));
    } else {
      orders = await db.purchase_orders.findMany({
        where: {
          supplier_id: parseInt(id),
          status: { not: 'CANCELLED' },
          total_amount: { gt: db.purchase_orders.fields.paid_amount }
        },
        select: {
          id: true,
          total_amount: true,
          paid_amount: true
        },
        orderBy: { created_at: 'asc' }
      });
      orders = orders.map(order => ({
        id: order.id,
        amount: Number(order.total_amount),
        paidAmount: Number(order.paid_amount || 0),
        remainingAmount: Number(order.total_amount) - Number(order.paid_amount || 0)
      }));
    }

    if (orders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy đơn hàng nào cần thanh toán' },
        { status: 404 }
      );
    }

    // Phân bổ tiền thanh toán vào các đơn hàng (FIFO - đơn cũ trước)
    let remainingPayment = amount;
    const updatedOrders: Array<{
      orderId: number;
      paymentAmount: number;
      newPaidAmount: number;
      newPaymentStatus: string;
    }> = [];

    const result = await db.$transaction(async (tx) => {
      for (const order of orders) {
        if (remainingPayment <= 0) break;

        const paymentForThisOrder = Math.min(remainingPayment, order.remainingAmount);
        const newPaidAmount = order.paidAmount + paymentForThisOrder;
        const newRemainingAmount = order.amount - newPaidAmount;

        let newPaymentStatus = 'PARTIAL';
        if (newRemainingAmount === 0) {
          newPaymentStatus = 'PAID';
        } else if (newPaidAmount === 0) {
          newPaymentStatus = 'UNPAID';
        }

        if (partnerType === 'customer') {
          await tx.orders.update({
            where: { id: order.id },
            data: {
              paid_amount: newPaidAmount,
              payment_status: newPaymentStatus
            }
          });
        } else {
          await tx.purchase_orders.update({
            where: { id: order.id },
            data: {
              paid_amount: newPaidAmount,
              payment_status: newPaymentStatus
            }
          });
        }

        updatedOrders.push({
          orderId: order.id,
          paymentAmount: paymentForThisOrder,
          newPaidAmount,
          newPaymentStatus,
        });

        remainingPayment -= paymentForThisOrder;
      }

      // Cập nhật số dư tài khoản ngân hàng nếu có
      if (bankAccountId) {
        const balanceChange = transactionType === 'THU' ? amount : -amount;
        await tx.bank_accounts.update({
          where: { id: bankAccountId },
          data: {
            balance: {
              increment: balanceChange
            }
          }
        });
      }

      return updatedOrders;
    });

    return NextResponse.json({
      success: true,
      message: 'Thanh toán thành công',
      data: {
        totalPayment: amount,
        ordersUpdated: result.length,
        details: result,
      },
    });
  } catch (error: unknown) {
    console.error('Error processing payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
