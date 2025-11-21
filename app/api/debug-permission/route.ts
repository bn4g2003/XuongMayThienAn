import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getUserPermissions } from '@/lib/permissions';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    // Lấy permissions của user
    const permissions = await getUserPermissions(user.roleId);
    
    // Kiểm tra permission admin.users
    const adminUsersPermission = permissions.find(p => p.permissionCode === 'admin.users');
    
    // Lấy thông tin từ database
    const dbCheck = await query(
      `SELECT 
        p.permission_code,
        rp.can_view,
        rp.can_create,
        rp.can_edit,
        rp.can_delete
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = $1 AND p.permission_code = 'admin.users'`,
      [user.roleId]
    );

    // Kiểm tra user trong database
    const userInDb = await query(
      'SELECT * FROM users WHERE id = $1',
      [user.id]
    );

    return NextResponse.json({
      tokenUser: {
        id: user.id,
        username: user.username,
        roleId: user.roleId,
        roleCode: user.roleCode,
        branchId: user.branchId,
        fullName: user.fullName,
      },
      dbUser: userInDb.rows[0] || null,
      isAdmin: user.roleCode === 'ADMIN',
      totalPermissions: permissions.length,
      adminUsersPermission: adminUsersPermission || null,
      dbCheck: dbCheck.rows[0] || null,
      diagnosis: !adminUsersPermission && user.roleCode !== 'ADMIN' 
        ? `❌ Role "${user.roleCode}" chưa được cấp quyền "admin.users". Vào /admin/roles để phân quyền.`
        : '✅ OK'
    });

  } catch (error: any) {
    console.error('[Debug Permission] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
