import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy danh sách công nợ
export async function GET(request: NextRequest) {
  const { hasPermission, error } = await requirePermission('finance.debts', 'view');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const debtType = searchParams.get('debtType'); // RECEIVABLE (Phải thu), PAYABLE (Phải trả)
    const status = searchParams.get('status'); // PENDING, PARTIAL, PAID, OVERDUE
    const customerId = searchParams.get('customerId');
    const supplierId = searchParams.get('supplierId');

    // Build where clause dynamically
    const where: {
      debt_type?: string;
      status?: string;
      customer_id?: number;
      supplier_id?: number;
    } = {};

    if (debtType) {
      where.debt_type = debtType;
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customer_id = parseInt(customerId);
    }

    if (supplierId) {
      where.supplier_id = parseInt(supplierId);
    }

    const result = await db.debt_management.findMany({
      where,
      include: {
        customers: {
          select: {
            customer_name: true,
            customer_code: true,
            phone: true
          }
        },
        suppliers: {
          select: {
            supplier_name: true,
            supplier_code: true,
            phone: true
          }
        }
      },
      orderBy: [
        { due_date: 'asc' },
        { created_at: 'desc' }
      ]
    });

    // Transform the result to match the original API response format
    const transformedResult = result.map(debt => ({
      id: debt.id,
      debtCode: debt.debt_code,
      debtType: debt.debt_type,
      originalAmount: Number(debt.original_amount),
      paidAmount: Number(debt.paid_amount),
      remainingAmount: Number(debt.remaining_amount),
      dueDate: debt.due_date,
      status: debt.status,
      referenceType: debt.reference_type,
      referenceId: debt.reference_id,
      notes: debt.notes,
      customerName: debt.customers?.customer_name,
      customerCode: debt.customers?.customer_code,
      customerPhone: debt.customers?.phone,
      supplierName: debt.suppliers?.supplier_name,
      supplierCode: debt.suppliers?.supplier_code,
      supplierPhone: debt.suppliers?.phone,
      createdAt: debt.created_at,
      updatedAt: debt.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: transformedResult,
    });
  } catch (error: unknown) {
    console.error('Error fetching debts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Tạo công nợ mới
export async function POST(request: NextRequest) {
  const { hasPermission, error } = await requirePermission('finance.debts', 'create');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      debtCode,
      customerId,
      supplierId,
      debtType,
      originalAmount,
      dueDate,
      referenceId,
      referenceType,
      notes,
    } = body;

    // Validate
    if (!debtCode || !debtType || !originalAmount) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    if (!['RECEIVABLE', 'PAYABLE'].includes(debtType)) {
      return NextResponse.json(
        { success: false, error: 'Loại công nợ không hợp lệ' },
        { status: 400 }
      );
    }

    // Kiểm tra phải có customer hoặc supplier
    if (debtType === 'RECEIVABLE' && !customerId) {
      return NextResponse.json(
        { success: false, error: 'Công nợ phải thu phải có khách hàng' },
        { status: 400 }
      );
    }

    if (debtType === 'PAYABLE' && !supplierId) {
      return NextResponse.json(
        { success: false, error: 'Công nợ phải trả phải có nhà cung cấp' },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      // Create the debt record
      const debt = await tx.debt_management.create({
        data: {
          debt_code: debtCode,
          customer_id: customerId || null,
          supplier_id: supplierId || null,
          debt_type: debtType,
          original_amount: originalAmount,
          remaining_amount: originalAmount,
          due_date: dueDate || null,
          reference_id: referenceId || null,
          reference_type: referenceType || null,
          notes: notes || null
        },
        select: {
          id: true,
          debt_code: true,
          debt_type: true,
          original_amount: true,
          remaining_amount: true,
          due_date: true,
          status: true,
          created_at: true
        }
      });

      // Update debt_amount for customer or supplier
      if (customerId) {
        await tx.customers.update({
          where: { id: customerId },
          data: {
            debt_amount: {
              increment: originalAmount
            }
          }
        });
      }

      if (supplierId) {
        await tx.suppliers.update({
          where: { id: supplierId },
          data: {
            debt_amount: {
              increment: originalAmount
            }
          }
        });
      }

      return debt;
    });

    // Transform the result to match the original API response format
    const transformedResult = {
      id: result.id,
      debtCode: result.debt_code,
      debtType: result.debt_type,
      originalAmount: Number(result.original_amount),
      remainingAmount: Number(result.remaining_amount),
      dueDate: result.due_date,
      status: result.status,
      createdAt: result.created_at
    };

    return NextResponse.json({
      success: true,
      data: transformedResult,
    });
  } catch (error: unknown) {
    console.error('Error creating debt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle unique constraint violation (debt_code)
    if (errorMessage.includes('debt_code') || errorMessage.includes('duplicate')) {
      return NextResponse.json(
        { success: false, error: 'Mã công nợ đã tồn tại' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
