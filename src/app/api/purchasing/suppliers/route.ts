import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.suppliers', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem nhà cung cấp'
      }, { status: 403 });
    }

    const result = await db.suppliers.findMany({
      where: {
        branch_id: currentUser.branchId
      },
      include: {
        supplier_groups: {
          select: {
            group_name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transform the data to match the expected format
    const formattedResult = result.map(supplier => ({
      id: supplier.id,
      supplierCode: supplier.supplier_code,
      supplierName: supplier.supplier_name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      groupName: supplier.supplier_groups?.group_name,
      debtAmount: supplier.debt_amount,
      isActive: supplier.is_active,
      createdAt: supplier.created_at
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: formattedResult
    });

  } catch (error) {
    console.error('Get suppliers error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.suppliers', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo nhà cung cấp'
      }, { status: 403 });
    }

    const body = await request.json();
    const { supplierCode, supplierName, phone, email, address, supplierGroupId } = body;

    const existingSupplier = await db.suppliers.findFirst({
      where: { supplier_code: supplierCode }
    });

    if (existingSupplier) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã nhà cung cấp đã tồn tại'
      }, { status: 400 });
    }

    const result = await db.suppliers.create({
      data: {
        supplier_code: supplierCode,
        supplier_name: supplierName,
        phone: phone || null,
        email: email || null,
        address: address || null,
        supplier_group_id: supplierGroupId || null,
        branch_id: currentUser.branchId
      },
      select: { id: true }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: result.id }
    });

  } catch (error) {
    console.error('Create supplier error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
