import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy danh sách tài khoản ngân hàng
export async function GET(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.cashbooks', 'view');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: Record<string, unknown> = {};

    // Filter by branch
    if (user.roleCode !== 'ADMIN') {
      where.branch_id = user.branchId;
    } else if (branchId) {
      where.branch_id = parseInt(branchId);
    }

    if (isActive !== null && isActive !== undefined) {
      where.is_active = isActive === 'true';
    }

    const result = await db.bank_accounts.findMany({
      where,
      include: {
        branches: {
          select: {
            branch_name: true
          }
        }
      },
      orderBy: [
        { bank_name: 'asc' },
        { account_number: 'asc' }
      ]
    });

    // Transform data to match expected format
    const transformedResult = result.map(account => ({
      id: account.id,
      accountNumber: account.account_number,
      accountHolder: account.account_holder,
      bankName: account.bank_name,
      branchName: account.branch_name,
      balance: account.balance,
      isActive: account.is_active,
      companyBranchName: account.branches?.branch_name,
      createdAt: account.created_at
    }));

    return NextResponse.json({
      success: true,
      data: transformedResult,
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Tạo tài khoản ngân hàng mới
export async function POST(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.cashbooks', 'create');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { accountNumber, accountHolder, bankName, branchName, balance, branchId } = body;

    // Validate
    if (!accountNumber || !accountHolder || !bankName) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const finalBranchId = user.roleCode === 'ADMIN' ? branchId : user.branchId;

    const result = await db.bank_accounts.create({
      data: {
        account_number: accountNumber,
        account_holder: accountHolder,
        bank_name: bankName,
        branch_name: branchName || null,
        balance: balance || 0,
        branch_id: finalBranchId
      },
      select: {
        id: true,
        account_number: true,
        account_holder: true,
        bank_name: true,
        branch_name: true,
        balance: true,
        is_active: true,
        created_at: true
      }
    });

    // Transform to match expected format
    const transformedResult = {
      id: result.id,
      accountNumber: result.account_number,
      accountHolder: result.account_holder,
      bankName: result.bank_name,
      branchName: result.branch_name,
      balance: result.balance,
      isActive: result.is_active,
      createdAt: result.created_at
    };

    return NextResponse.json({
      success: true,
      data: transformedResult,
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error creating bank account:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


