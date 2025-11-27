import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy danh sách users
export async function GET(request: NextRequest) {
  try {
    // Kiểm tra quyền xem users
    const { hasPermission, user: currentUser, error } = await requirePermission('admin.users', 'view');

    console.log('[Get Users API] Permission check result:', { hasPermission, error });
    console.log('[Get Users API] Current user:', currentUser);

    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem người dùng'
      }, { status: 403 });
    }

    if (!currentUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy thông tin user'
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    console.log('[Get Users] Current user:', {
      id: currentUser.id,
      username: currentUser.username,
      roleCode: currentUser.roleCode,
      branchId: currentUser.branchId
    });

    // ADMIN xem toàn bộ users, user khác chỉ xem users trong chi nhánh của mình
    let users: Array<{
      id: number;
      user_code: string;
      username: string;
      full_name: string;
      email: string | null;
      phone: string | null;
      branch_id: number | null;
      role_id: number | null;
      is_active: boolean | null;
      created_at: Date | null;
      branches: { branch_name: string } | null;
      roles: { role_name: string; role_code: string } | null;
    }>;
    let total: number;

    if (currentUser.roleCode !== 'ADMIN') {
      // User không phải ADMIN chỉ xem users trong chi nhánh của mình
      console.log('[Get Users] Filtering by branch:', currentUser.branchId);

      users = await db.users.findMany({
        where: {
          branch_id: currentUser.branchId,
        },
        include: {
          branches: {
            select: {
              branch_name: true,
            },
          },
          roles: {
            select: {
              role_name: true,
              role_code: true,
            },
          },
        },
        orderBy: {
          id: 'desc',
        },
        skip: offset,
        take: limit,
      });

      total = await db.users.count({
        where: {
          branch_id: currentUser.branchId,
        },
      });
    } else {
      // ADMIN xem tất cả users
      console.log('[Get Users] ADMIN - showing all users');

      users = await db.users.findMany({
        include: {
          branches: {
            select: {
              branch_name: true,
            },
          },
          roles: {
            select: {
              role_name: true,
              role_code: true,
            },
          },
        },
        orderBy: {
          id: 'desc',
        },
        skip: offset,
        take: limit,
      });

      total = await db.users.count();
    }

    console.log('[Get Users] Query executed, rows:', users.length);

    // Transform data to match the expected format
    const transformedUsers = users.map((user) => ({
      id: user.id,
      userCode: user.user_code,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      branchId: user.branch_id,
      roleId: user.role_id,
      isActive: user.is_active,
      createdAt: user.created_at,
      branchName: user.branches?.branch_name,
      roleName: user.roles?.role_name,
      roleCode: user.roles?.role_code,
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        users: transformedUsers,
        total,
        page,
        limit
      }
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Get users error:', err);
    console.error('Error stack:', err.stack);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server: ' + err.message
    }, { status: 500 });
  }
}

// POST - Tạo user mới
export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền tạo user
    const { hasPermission, error } = await requirePermission('admin.users', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo người dùng'
      }, { status: 403 });
    }

    const body = await request.json();
    const { userCode, username, password, fullName, email, phone, branchId, roleId } = body;

    // Validation
    if (!userCode || !username || !password || !fullName || !branchId || !roleId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    // Kiểm tra username đã tồn tại
    const existingUser = await db.users.findFirst({
      where: {
        username: username,
      },
    });

    if (existingUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Tên đăng nhập đã tồn tại'
      }, { status: 400 });
    }

    // Tạo user mới (tạm thời không mã hóa password)
    const newUser = await db.users.create({
      data: {
        user_code: userCode,
        username: username,
        password_hash: password,
        full_name: fullName,
        email: email,
        phone: phone,
        branch_id: branchId,
        role_id: roleId,
      },
      select: {
        id: true,
        user_code: true,
        username: true,
        full_name: true,
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: newUser.id,
        userCode: newUser.user_code,
        username: newUser.username,
        fullName: newUser.full_name,
      },
      message: 'Tạo người dùng thành công'
    });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
