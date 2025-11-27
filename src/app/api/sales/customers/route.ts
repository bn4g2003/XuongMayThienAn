import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.customers', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem khách hàng'
      }, { status: 403 });
    }

    const customers = await db.customers.findMany({
      where: { branch_id: currentUser.branchId },
      include: { customer_groups: true },
      orderBy: { created_at: 'desc' }
    });

    const result = customers.map(customer => ({
      id: customer.id,
      customerCode: customer.customer_code,
      customerName: customer.customer_name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      customerGroupId: customer.customer_group_id,
      groupName: customer.customer_groups?.group_name || null,
      priceMultiplier: Number(customer.customer_groups?.price_multiplier || 0),
      debtAmount: Number(customer.debt_amount),
      isActive: customer.is_active,
      createdAt: customer.created_at
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.customers', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo khách hàng'
      }, { status: 403 });
    }

    const body = await request.json();
    const { customerCode, customerName, phone, email, address, customerGroupId } = body;

    // Kiểm tra mã khách hàng trùng
    const existing = await db.customers.findFirst({
      where: { customer_code: customerCode }
    });

    if (existing) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã khách hàng đã tồn tại'
      }, { status: 400 });
    }

    const newCustomer = await db.customers.create({
      data: {
        customer_code: customerCode,
        customer_name: customerName,
        phone: phone || null,
        email: email || null,
        address: address || null,
        customer_group_id: customerGroupId || null,
        branch_id: currentUser.branchId
      }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: newCustomer.id }
    });

  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
