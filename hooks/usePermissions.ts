import { useEffect, useState } from 'react';

interface Permission {
  permissionCode: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/auth/permissions');
      const data = await res.json();
      console.log('[usePermissions] API Response:', data);
      if (data.success) {
        setIsAdmin(data.data.isAdmin || false);
        setPermissions(data.data.permissions || []);
        console.log('[usePermissions] isAdmin:', data.data.isAdmin);
        console.log('[usePermissions] permissions count:', data.data.permissions?.length || 0);
      } else {
        console.error('[usePermissions] API Error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const can = (permissionCode: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    // ADMIN có toàn quyền
    if (isAdmin) return true;

    const permission = permissions.find(p => p.permissionCode === permissionCode);
    if (!permission) return false;

    switch (action) {
      case 'view': return permission.canView;
      case 'create': return permission.canCreate;
      case 'edit': return permission.canEdit;
      case 'delete': return permission.canDelete;
      default: return false;
    }
  };

  return { permissions, isAdmin, loading, can };
};
