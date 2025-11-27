import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy danh sách sổ quỹ
export async function GET(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.cashbooks', 'view');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const transactionType = searchParams.get('transactionType'); // THU, CHI
    const paymentMethod = searchParams.get('paymentMethod'); // CASH, BANK, TRANSFER
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branchId = searchParams.get('branchId');

    // Build where clause
    const where: any = {};

    // Filter by branch (nếu không phải ADMIN)
    if (user.roleCode !== 'ADMIN') {
      where.branch_id = user.branchId;
    } else if (branchId) {
      where.branch_id = parseInt(branchId);
    }

    if (transactionType) {
      where.transaction_type = transactionType;
    }

    if (paymentMethod) {
      where.payment_method = paymentMethod;
    }

    if (startDate || endDate) {
      where.transaction_date = {};
      if (startDate) {
        where.transaction_date.gte = new Date(startDate);
      }
      if (endDate) {
        where.transaction_date.lte = new Date(endDate);
      }
    }

    const cashbooks = await db.cash_books.findMany({
      where,
      include: {
        financial_categories: true,
        bank_accounts: true,
        users: true,
        branches: true
      },
      orderBy: [
        { transaction_date: 'desc' },
        { created_at: 'desc' }
      ]
    });

    const data = cashbooks.map(cb => ({
      id: cb.id,
      transactionCode: cb.transaction_code,
      transactionDate: cb.transaction_date,
      amount: cb.amount,
      transactionType: cb.transaction_type,
      paymentMethod: cb.payment_method,
      description: cb.description,
      referenceType: cb.reference_type,
      referenceId: cb.reference_id,
      categoryId: cb.financial_category_id,
      bankAccountId: cb.bank_account_id,
      categoryName: cb.financial_categories?.category_name,
      categoryCode: cb.financial_categories?.category_code,
      bankAccountNumber: cb.bank_accounts?.account_number,
      bankName: cb.bank_accounts?.bank_name,
      createdByName: cb.users?.full_name,
      branchName: cb.branches?.branch_name,
      createdAt: cb.created_at
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error('Error fetching cash books:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Tạo phiếu thu/chi mới
export async function POST(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.cashbooks', 'create');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      transactionCode,
      transactionDate,
      financialCategoryId,
      amount,
      transactionType,
      paymentMethod,
      bankAccountId,
      referenceId,
      referenceType,
      description,
      branchId,
    } = body;

    // Validate
    if (!transactionCode || !transactionDate || !financialCategoryId || !amount || !transactionType || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    if (!['THU', 'CHI'].includes(transactionType)) {
      return NextResponse.json(
        { success: false, error: 'Loại giao dịch không hợp lệ' },
        { status: 400 }
      );
    }

    if (!['CASH', 'BANK', 'TRANSFER'].includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Phương thức thanh toán không hợp lệ' },
        { status: 400 }
      );
    }

    // Nếu thanh toán qua ngân hàng, phải có bank_account_id
    if ((paymentMethod === 'BANK' || paymentMethod === 'TRANSFER') && !bankAccountId) {
      return NextResponse.json(
        { success: false, error: 'Phải chọn tài khoản ngân hàng' },
        { status: 400 }
      );
    }

    const finalBranchId = user.roleCode === 'ADMIN' ? branchId : user.branchId;

    const newCashbook = await db.cash_books.create({
      data: {
        transaction_code: transactionCode,
        transaction_date: new Date(transactionDate),
        financial_category_id: financialCategoryId,
        amount: amount,
        transaction_type: transactionType,
        payment_method: paymentMethod,
        bank_account_id: bankAccountId || null,
        reference_id: referenceId || null,
        reference_type: referenceType || null,
        description: description,
        created_by: user.id,
        branch_id: finalBranchId
      },
      select: {
        id: true,
        transaction_code: true,
        transaction_date: true,
        amount: true,
        transaction_type: true,
        payment_method: true,
        description: true,
        created_at: true
      }
    });

    // Cập nhật số dư tài khoản ngân hàng nếu có
    if (bankAccountId) {
      const balanceChange = transactionType === 'THU' ? amount : -amount;
      await db.bank_accounts.update({
        where: { id: bankAccountId },
        data: {
          balance: {
            increment: balanceChange
          }
        }
      });
    }

    const data = {
      id: newCashbook.id,
      transactionCode: newCashbook.transaction_code,
      transactionDate: newCashbook.transaction_date,
      amount: newCashbook.amount,
      transactionType: newCashbook.transaction_type,
      paymentMethod: newCashbook.payment_method,
      description: newCashbook.description,
      createdAt: newCashbook.created_at
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error('Error creating cash book:', error);

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Mã giao dịch đã tồn tại' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
