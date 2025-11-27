import { generateToken, setAuthCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng nhập tên đăng nhập và mật khẩu'
      }, { status: 400 });
    }

    // Tìm user (tạm thời không mã hóa password)
    const user = await db.users.findFirst({
      where: {
        username: username,
        is_active: true
      },
      include: {
        roles: {
          select: {
            role_code: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Tên đăng nhập không tồn tại'
      }, { status: 401 });
    }

    // Kiểm tra password (tạm thời so sánh trực tiếp)
    if (user.password_hash !== password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mật khẩu không đúng'
      }, { status: 401 });
    }

    // Tạo token
    const token = generateToken({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      branchId: user.branch_id || 0,
      roleId: user.role_id || 0,
      roleCode: user.roles?.role_code || '',
    });

    // Set cookie
    await setAuthCookie(token);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          branchId: user.branch_id,
          roleCode: user.roles?.role_code || '',
        }
      },
      message: 'Đăng nhập thành công'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'

    }, { status: 500 });
  }
}
