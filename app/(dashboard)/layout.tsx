'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';

interface User {
  id: number;
  username: string;
  fullName: string;
  roleCode: string;
}

interface Warehouse {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: 'NVL' | 'THANH_PHAM';
  branchId: number;
  branchName: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { can } = usePermissions();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchWarehouses();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (data.success) {
        setUser(data.data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/inventory/warehouses');
      const data = await res.json();
      if (data.success) {
        setWarehouses(data.data);
      } else {
        setWarehouses([]);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      setWarehouses([]);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const getBreadcrumbTitle = (path: string) => {
    const breadcrumbMap: Record<string, string> = {
      '/admin/users': 'Quản lý người dùng',
      '/admin/roles': 'Quản lý vai trò',
      '/admin/branches': 'Quản lý chi nhánh',
      '/admin/warehouses': 'Quản lý kho hàng',
      '/products': 'Quản lý sản phẩm',
      '/products/categories': 'Danh mục sản phẩm',
      '/products/materials': 'Nguyên vật liệu',
      '/inventory': 'Quản lý kho',
      '/inventory/import': 'Nhập kho',
      '/inventory/export': 'Xuất kho',
      '/inventory/transfer': 'Luân chuyển kho',
      '/inventory/balance': 'Báo cáo tồn kho',
      '/sales/customers': 'Khách hàng',
      '/sales/orders': 'Đơn hàng',
      '/sales/reports': 'Báo cáo bán hàng',
      '/purchasing/suppliers': 'Nhà cung cấp',
      '/purchasing/orders': 'Đơn đặt hàng',
      '/finance/cash-books': 'Sổ quỹ',
      '/finance/debts': 'Công nợ',
      '/finance/reports': 'Báo cáo tài chính',
    };
    
    // Kiểm tra exact match
    if (breadcrumbMap[path]) return breadcrumbMap[path];
    
    // Kiểm tra dynamic routes (có /[id]/)
    for (const [key, value] of Object.entries(breadcrumbMap)) {
      if (path.startsWith(key + '/')) {
        return value;
      }
    }
    
    return path.split('/').pop() || 'Trang';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  // Định nghĩa menu với permission code
  const allMenuItems: Array<{
    title: string;
    icon: string;
    href?: string;
    permission?: string | null;
    children?: Array<{
      title: string;
      href: string;
      permission?: string;
    }>;
  }> = [
    { title: 'Dashboard', href: '/dashboard', icon: '📊', permission: null },
    { 
      title: 'Quản trị', 
      icon: '⚙️',
      children: [
        { title: 'Người dùng', href: '/admin/users', permission: 'admin.users' },
        { title: 'Vai trò', href: '/admin/roles', permission: 'admin.roles' },
        { title: 'Chi nhánh', href: '/admin/branches', permission: 'admin.branches' },
        { title: 'Kho hàng', href: '/admin/warehouses', permission: 'admin.warehouses' },
      ]
    },
    {
      title: 'Sản phẩm',
      icon: '📦',
      children: [
        { title: 'Danh mục', href: '/products/categories', permission: 'products.categories' },
        { title: 'Sản phẩm', href: '/products', permission: 'products.products' },
        { title: 'Nguyên vật liệu', href: '/products/materials', permission: 'products.materials' },
      ]
    },
    {
      title: 'Kho',
      icon: '🏪',
      permission: 'inventory.balance',
      children: [] // Sẽ được thêm động từ API
    },
    {
      title: 'Bán hàng',
      icon: '🛒',
      children: [
        { title: 'Khách hàng', href: '/sales/customers', permission: 'sales.customers' },
        { title: 'Đơn hàng', href: '/sales/orders', permission: 'sales.orders' },
        { title: 'Báo cáo', href: '/sales/reports', permission: 'sales.reports' },
      ]
    },
    {
      title: 'Mua hàng',
      icon: '🛍️',
      children: [
        { title: 'Nhà cung cấp', href: '/purchasing/suppliers', permission: 'purchasing.suppliers' },
        { title: 'Đơn đặt hàng', href: '/purchasing/orders', permission: 'purchasing.orders' },
      ]
    },
    {
      title: 'Tài chính',
      icon: '💰',
      children: [
        { title: 'Sổ quỹ', href: '/finance/cashbooks', permission: 'finance.cashbooks' },
        { title: 'Công nợ', href: '/finance/debts', permission: 'finance.debts' },
        { title: 'Báo cáo', href: '/finance/reports', permission: 'finance.reports' },
      ]
    },
  ];

  // Lọc menu theo quyền
  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const menuItems = allMenuItems
    .map(item => {
      // Xử lý đặc biệt cho menu Kho - thêm danh sách kho động
      if (item.title === 'Kho' && item.children) {
        const warehouseChildren = warehouses.map(wh => ({
          title: wh.warehouseName,
          href: `/inventory?warehouseId=${wh.id}`,
          permission: undefined,
          warehouseType: wh.warehouseType,
          warehouseCode: wh.warehouseCode
        }));
        
        if (warehouseChildren.length === 0) return null;
        
        return { ...item, children: warehouseChildren };
      }
      
      if (item.children) {
        // Lọc children theo quyền
        const filteredChildren = item.children.filter(child => 
          !child.permission || can(child.permission, 'view')
        );
        
        // Chỉ hiển thị group nếu có ít nhất 1 child được phép
        if (filteredChildren.length === 0) return null;
        
        return { ...item, children: filteredChildren };
      }
      
      // Menu không có children - kiểm tra quyền
      if (item.permission && !can(item.permission, 'view')) return null;
      
      return item;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-gray-900 text-white transition-all ${sidebarOpen ? 'w-64' : 'w-16'} overflow-hidden flex flex-col`}>
        <div className={`p-4 border-b border-gray-700 flex-shrink-0 ${!sidebarOpen && 'flex justify-center'}`}>
          {sidebarOpen ? (
            <h2 className="text-xl font-bold">POS System</h2>
          ) : (
            <span className="text-2xl">📦</span>
          )}
        </div>
        <nav className="p-2 space-y-1 overflow-y-auto flex-1">
          {menuItems.map((item, idx) => (
            <div key={idx}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded hover:bg-gray-700 transition-colors ${pathname === item.href ? 'bg-gray-700' : ''}`}
                  title={!sidebarOpen ? item.title : undefined}
                >
                  <span className="text-xl">{item.icon}</span>
                  {sidebarOpen && <span className="ml-3">{item.title}</span>}
                </Link>
              ) : (
                <div>
                  <button
                    onClick={() => toggleGroup(item.title)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded hover:bg-gray-700 transition-colors ${!sidebarOpen && 'justify-center'}`}
                    title={!sidebarOpen ? item.title : undefined}
                  >
                    <div className="flex items-center">
                      <span className="text-xl">{item.icon}</span>
                      {sidebarOpen && <span className="ml-3 font-medium text-gray-300">{item.title}</span>}
                    </div>
                    {sidebarOpen && (
                      <span className="text-gray-400 text-sm">
                        {expandedGroups[item.title] ? '▼' : '▶'}
                      </span>
                    )}
                  </button>
                  {sidebarOpen && expandedGroups[item.title] && item.children?.map((child: any, childIdx) => (
                    <Link
                      key={childIdx}
                      href={child.href}
                      className={`block pl-12 pr-3 py-2 rounded hover:bg-gray-700 text-sm transition-colors ${pathname === child.href || pathname.startsWith(child.href.split('?')[0]) ? 'bg-gray-700' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{child.title}</span>
                        {child.warehouseType && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            child.warehouseType === 'NVL' 
                              ? 'bg-purple-600 text-purple-100' 
                              : 'bg-green-600 text-green-100'
                          }`}>
                            {child.warehouseType === 'NVL' ? 'NVL' : 'TP'}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User Info - Ở dưới cùng */}
        <div className={`border-t border-gray-700 p-3 flex-shrink-0 ${!sidebarOpen && 'flex flex-col items-center'}`}>
          {sidebarOpen ? (
            <>
              <div className="text-sm text-gray-300 mb-2">
                <div className="font-medium truncate">{user?.fullName}</div>
                <div className="text-xs text-gray-400">{user?.roleCode}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm transition-colors"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              title="Đăng xuất"
            >
              🚪
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {/* Header */}
        <header className="bg-white shadow">
          <div className="px-6 py-4 border-b">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-600 hover:text-gray-900 text-xl"
            >
              ☰
            </button>
          </div>
          
          {/* Breadcrumb */}
          <div className="px-6 py-3 bg-gray-50">
            <nav className="flex items-center text-sm text-gray-600">
              <Link href="/dashboard" className="hover:text-blue-600">
                🏠 Dashboard
              </Link>
              {pathname !== '/dashboard' && (
                <>
                  <span className="mx-2">/</span>
                  <span className="text-gray-900 font-medium">
                    {getBreadcrumbTitle(pathname)}
                  </span>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
