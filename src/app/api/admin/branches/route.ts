import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Kiểm tra quyền xem branches
    const { hasPermission, error } = await requirePermission('admin.branches', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem chi nhánh'
      }, { status: 403 });
    }

    const branches = await db.branches.findMany({
      select: {
        id: true,
        branch_code: true,
        branch_name: true,
        address: true,
        phone: true,
        email: true,
        is_active: true,
        created_at: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    const result = branches.map(b => ({
      id: b.id,
      branchCode: b.branch_code,
      branchName: b.branch_name,
      address: b.address,
      phone: b.phone,
      email: b.email,
      isActive: b.is_active,
      createdAt: b.created_at
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get branches error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền tạo branch
    const { hasPermission, error } = await requirePermission('admin.branches', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo chi nhánh'
      }, { status: 403 });
    }

    const body = await request.json();
    const { branchCode, branchName, address, phone, email } = body;

    if (!branchCode || !branchName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    const result = await db.branches.create({
      data: {
        branch_code: branchCode,
        branch_name: branchName,
        address: address,
        phone: phone,
        email: email
      },
      select: {
        id: true,
        branch_code: true,
        branch_name: true
      }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: result.id,
        branchCode: result.branch_code,
        branchName: result.branch_name
      },
      message: 'Tạo chi nhánh thành công'
    });

  } catch (error: unknown) {
    console.error('Create branch error:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã chi nhánh đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
