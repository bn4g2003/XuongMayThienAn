import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy lịch sử thanh toán công nợ
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, error } = await requirePermission('finance.debts', 'view');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  const { id } = await params;

  try {
    const payments = await db.debt_payments.findMany({
      where: { debt_id: parseInt(id) },
      include: {
        bank_accounts: true,
        users: true
      },
      orderBy: [
        { payment_date: 'desc' },
        { created_at: 'desc' }
      ]
    });

    const data = payments.map(payment => ({
      id: payment.id,
      paymentAmount: payment.payment_amount,
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method,
      notes: payment.notes,
      bankAccountNumber: payment.bank_accounts?.account_number,
      bankName: payment.bank_accounts?.bank_name,
      createdByName: payment.users?.full_name,
      createdAt: payment.created_at
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error('Error fetching debt payments:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Thanh toán công nợ
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, user, error } = await requirePermission('finance.debts', 'edit');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { paymentAmount, paymentDate, paymentMethod, bankAccountId, notes } = body;

    // Validate
    if (!paymentAmount || !paymentDate || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Lấy thông tin công nợ
    const debt = await db.debt_management.findUnique({
      where: { id: parseInt(id) },
      select: {
        remaining_amount: true,
        customer_id: true,
        supplier_id: true,
        debt_type: true
      }
    });

    if (!debt) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy công nợ' },
        { status: 404 }
      );
    }

    if (paymentAmount > Number(debt.remaining_amount)) {
      return NextResponse.json(
        { success: false, error: 'Số tiền thanh toán vượt quá công nợ còn lại' },
        { status: 400 }
      );
    }

    // Use transaction for all operations
    const result = await db.$transaction(async (tx) => {
      // Thêm thanh toán
      const newPayment = await tx.debt_payments.create({
        data: {
          debt_id: parseInt(id),
          payment_amount: paymentAmount,
          payment_date: new Date(paymentDate),
          payment_method: paymentMethod,
          bank_account_id: bankAccountId || null,
          notes,
          created_by: user.id
        },
        select: {
          id: true,
          payment_amount: true,
          payment_date: true,
          payment_method: true,
          created_at: true
        }
      });

      // Cập nhật remaining_amount
      const newRemaining = Number(debt.remaining_amount) - paymentAmount;
      let newStatus = 'PARTIAL';

      if (newRemaining === 0) {
        newStatus = 'PAID';
      } else if (newRemaining === Number(debt.remaining_amount)) {
        newStatus = 'PENDING';
      }

      await tx.debt_management.update({
        where: { id: parseInt(id) },
        data: {
          remaining_amount: newRemaining,
          status: newStatus,
          updated_at: new Date()
        }
      });

      // Cập nhật debt_amount của customer hoặc supplier
      if (debt.customer_id) {
        await tx.customers.update({
          where: { id: debt.customer_id },
          data: {
            debt_amount: {
              decrement: paymentAmount
            }
          }
        });
      }

      if (debt.supplier_id) {
        await tx.suppliers.update({
          where: { id: debt.supplier_id },
          data: {
            debt_amount: {
              decrement: paymentAmount
            }
          }
        });
      }

      // Cập nhật số dư tài khoản ngân hàng nếu có
      if (bankAccountId) {
        const balanceChange = debt.debt_type === 'RECEIVABLE' ? paymentAmount : -paymentAmount;
        await tx.bank_accounts.update({
          where: { id: bankAccountId },
          data: {
            balance: {
              increment: balanceChange
            }
          }
        });
      }

      return newPayment;
    });

    const data = {
      id: result.id,
      paymentAmount: result.payment_amount,
      paymentDate: result.payment_date,
      paymentMethod: result.payment_method,
      createdAt: result.created_at
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error('Error creating debt payment:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
