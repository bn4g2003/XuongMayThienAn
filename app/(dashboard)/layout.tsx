"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/providers/AppThemeProvider";
import {
  Layout,
  Menu,
  Breadcrumb,
  Avatar,
  Typography,
  Dropdown,
  Tag,
  Spin,
  theme,
} from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  SettingOutlined,
  UserOutlined,
  InboxOutlined,
  AppstoreOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  DollarOutlined,
  LogoutOutlined,
  CheckOutlined,
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import { themeColors } from "@/configs/theme";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

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
  warehouseType: "NVL" | "THANH_PHAM";
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
  const { mode, themeName, setMode, setThemeName } = useTheme();
  const { token } = theme.useToken();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      fetchWarehouses();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();

      if (data.success) {
        setUser(data.data.user);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch("/api/inventory/warehouses");
      const data = await res.json();
      if (data.success) {
        setWarehouses(data.data);
      } else {
        setWarehouses([]);
      }
    } catch (_error) {
      console.error("Error fetching warehouses:", _error);
      setWarehouses([]);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const getBreadcrumbTitle = (path: string) => {
    const breadcrumbMap: Record<string, string> = {
      "/admin/users": "Quản lý người dùng",
      "/admin/roles": "Quản lý vai trò",
      "/admin/branches": "Quản lý chi nhánh",
      "/admin/warehouses": "Quản lý kho hàng",
      "/products": "Quản lý sản phẩm",
      "/products/categories": "Danh mục sản phẩm",
      "/products/materials": "Nguyên vật liệu",
      "/inventory": "Quản lý kho",
      "/inventory/import": "Nhập kho",
      "/inventory/export": "Xuất kho",
      "/inventory/transfer": "Luân chuyển kho",
      "/inventory/balance": "Báo cáo tồn kho",
      "/sales/customers": "Khách hàng",
      "/sales/orders": "Đơn hàng",
      "/sales/reports": "Báo cáo bán hàng",
      "/purchasing/suppliers": "Nhà cung cấp",
      "/purchasing/orders": "Đơn đặt hàng",
      "/finance/cash-books": "Sổ quỹ",
      "/finance/debts": "Công nợ",
      "/finance/reports": "Báo cáo tài chính",
    };

    if (breadcrumbMap[path]) return breadcrumbMap[path];

    for (const [key, value] of Object.entries(breadcrumbMap)) {
      if (path.startsWith(key + "/")) {
        return value;
      }
    }

    return path.split("/").pop() || "Trang";
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" tip="Đang tải..." />
      </div>
    );
  }

  const allMenuItems: Array<{
    title: string;
    icon: React.ReactNode;
    href?: string;
    permission?: string | null;
    children?: Array<{
      title: string;
      href: string;
      permission?: string;
      warehouseType?: "NVL" | "THANH_PHAM";
      warehouseCode?: string;
    }>;
  }> = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <DashboardOutlined />,
      permission: null,
    },
    {
      title: "Quản trị",
      icon: <SettingOutlined />,
      children: [
        {
          title: "Người dùng",
          href: "/admin/users",
          permission: "admin.users",
        },
        { title: "Vai trò", href: "/admin/roles", permission: "admin.roles" },
        {
          title: "Chi nhánh",
          href: "/admin/branches",
          permission: "admin.branches",
        },
        {
          title: "Kho hàng",
          href: "/admin/warehouses",
          permission: "admin.warehouses",
        },
      ],
    },
    {
      title: "Sản phẩm",
      icon: <AppstoreOutlined />,
      children: [
        {
          title: "Danh mục",
          href: "/products/categories",
          permission: "products.categories",
        },
        {
          title: "Sản phẩm",
          href: "/products",
          permission: "products.products",
        },
        {
          title: "Nguyên vật liệu",
          href: "/products/materials",
          permission: "products.materials",
        },
      ],
    },
    {
      title: "Kho",
      icon: <InboxOutlined />,
      permission: "inventory.balance",
      children: [],
    },
    {
      title: "Bán hàng",
      icon: <ShoppingCartOutlined />,
      children: [
        {
          title: "Khách hàng",
          href: "/sales/customers",
          permission: "sales.customers",
        },
        {
          title: "Đơn hàng",
          href: "/sales/orders",
          permission: "sales.orders",
        },
        {
          title: "Báo cáo",
          href: "/sales/reports",
          permission: "sales.reports",
        },
      ],
    },
    {
      title: "Mua hàng",
      icon: <ShoppingOutlined />,
      children: [
        {
          title: "Nhà cung cấp",
          href: "/purchasing/suppliers",
          permission: "purchasing.suppliers",
        },
        {
          title: "Đơn đặt hàng",
          href: "/purchasing/orders",
          permission: "purchasing.orders",
        },
      ],
    },
    {
      title: "Tài chính",
      icon: <DollarOutlined />,
      children: [
        {
          title: "Sổ quỹ",
          href: "/finance/cashbooks",
          permission: "finance.cashbooks",
        },
        {
          title: "Công nợ",
          href: "/finance/debts",
          permission: "finance.debts",
        },
        {
          title: "Báo cáo",
          href: "/finance/reports",
          permission: "finance.reports",
        },
      ],
    },
  ];

  const menuItems = allMenuItems
    .map((item) => {
      if (item.title === "Kho" && item.children) {
        const warehouseChildren = warehouses.map((wh) => ({
          title: wh.warehouseName,
          href: `/inventory?warehouseId=${wh.id}`,
          permission: undefined,
          warehouseType: wh.warehouseType,
          warehouseCode: wh.warehouseCode,
        }));

        if (warehouseChildren.length === 0) return null;

        return { ...item, children: warehouseChildren };
      }

      if (item.children) {
        const filteredChildren = item.children.filter(
          (child) => !child.permission || can(child.permission, "view")
        );

        if (filteredChildren.length === 0) return null;

        return { ...item, children: filteredChildren };
      }

      if (item.permission && !can(item.permission, "view")) return null;

      return item;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const antdMenuItems: MenuProps["items"] = menuItems.map((item, idx) => {
    if (item.href) {
      return {
        key: item.href,
        icon: item.icon,
        label: <Link href={item.href}>{item.title}</Link>,
      };
    } else {
      return {
        key: `group-${idx}`,
        icon: item.icon,
        label: item.title,
        children: item.children?.map((child) => ({
          key: child.href,
          label: (
            <Link href={child.href}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: token.colorText,
                }}
              >
                <span>{child.title}</span>
                {child.warehouseType && (
                  <Tag
                    color={child.warehouseType === "NVL" ? "purple" : "green"}
                  >
                    {child.warehouseType === "NVL" ? "NVL" : "TP"}
                  </Tag>
                )}
              </div>
            </Link>
          ),
        })),
      };
    }
  });

  const getSelectedKey = () => {
    const matchedItem = antdMenuItems?.find((item) => {
      if (item && "key" in item) {
        if (typeof item.key === "string" && !item.key.startsWith("group-")) {
          return (
            pathname === item.key || pathname.startsWith(item.key.split("?")[0])
          );
        }
        if (item && "children" in item && item.children) {
          return item.children.some(
            (child) =>
              child &&
              "key" in child &&
              (pathname === child.key ||
                pathname.startsWith(String(child.key).split("?")[0]))
          );
        }
      }
      return false;
    });

    if (matchedItem && "children" in matchedItem && matchedItem.children) {
      const selectedChild = matchedItem.children.find(
        (child) =>
          child &&
          "key" in child &&
          (pathname === child.key ||
            pathname.startsWith(String(child.key).split("?")[0]))
      );
      return selectedChild?.key ? [String(selectedChild.key)] : [];
    }

    return matchedItem?.key ? [String(matchedItem.key)] : [];
  };

  const getOpenKeys = () => {
    const openKeys: string[] = [];
    antdMenuItems?.forEach((item) => {
      if (item && "children" in item && item.children) {
        const hasActiveChild = item.children.some(
          (child) =>
            child &&
            "key" in child &&
            (pathname === child.key ||
              pathname.startsWith(String(child.key).split("?")[0]))
        );
        if (hasActiveChild && item.key) {
          openKeys.push(String(item.key));
        }
      }
    });
    return openKeys;
  };

  const getBreadcrumbItems = () => {
    const items = [
      {
        title: (
          <Link href="/dashboard">
            <span className="flex gap-2 items-center">
              <DashboardOutlined /> <span>Dashboard</span>
            </span>
          </Link>
        ),
      },
    ];

    if (pathname !== "/dashboard") {
      items.push({
        title: <span>{getBreadcrumbTitle(pathname)}</span>,
      });
    }

    return items;
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "mode",
      icon: mode === "dark" ? <MoonOutlined /> : <SunOutlined />,
      label: mode === "dark" ? "Chế độ sáng" : "Chế độ tối",
      onClick: () => setMode(mode === "dark" ? "light" : "dark"),
    },
    {
      type: "divider",
    },
    {
      key: "color",
      label: "Màu chủ đề",
      type: "group",
    },
    {
      key: "default",
      label: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: themeColors.default.primary,
                marginRight: 8,
                border: "2px solid rgba(0,0,0,0.1)",
              }}
            />
            Cam
          </span>
          {themeName === "default" && (
            <CheckOutlined style={{ color: "#52c41a" }} />
          )}
        </div>
      ),
      onClick: () => setThemeName("default"),
    },
    {
      key: "blue",
      label: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: themeColors.blue.primary,
                marginRight: 8,
                border: "2px solid rgba(0,0,0,0.1)",
              }}
            />
            Xanh dương
          </span>
          {themeName === "blue" && (
            <CheckOutlined style={{ color: "#52c41a" }} />
          )}
        </div>
      ),
      onClick: () => setThemeName("blue"),
    },
    {
      key: "yellow",
      label: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: themeColors.yellow.primary,
                marginRight: 8,
                border: "2px solid rgba(0,0,0,0.1)",
              }}
            />
            Vàng
          </span>
          {themeName === "yellow" && (
            <CheckOutlined style={{ color: "#52c41a" }} />
          )}
        </div>
      ),
      onClick: () => setThemeName("yellow"),
    },
    {
      key: "pink",
      label: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: themeColors.pink.primary,
                marginRight: 8,
                border: "2px solid rgba(0,0,0,0.1)",
              }}
            />
            Hồng
          </span>
          {themeName === "pink" && (
            <CheckOutlined style={{ color: "#52c41a" }} />
          )}
        </div>
      ),
      onClick: () => setThemeName("pink"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={!sidebarOpen}
        onCollapse={(collapsed) => setSidebarOpen(!collapsed)}
        style={{
          overflow: "auto",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {sidebarOpen ? (
            <Text
              style={{
                color: token.colorPrimary,
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              POS System
            </Text>
          ) : (
            <span style={{ fontSize: 24 }}>📦</span>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={getSelectedKey()}
          defaultOpenKeys={getOpenKeys()}
          items={antdMenuItems}
        />
      </Sider>

      <Layout
        style={{ marginLeft: sidebarOpen ? 200 : 80, transition: "all 0.2s" }}
      >
        <Header
          style={{
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${token.colorBorder}`,
            borderLeft: `1px solid ${token.colorBorder}`,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <Breadcrumb items={getBreadcrumbItems()} />

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <Avatar
                icon={<UserOutlined />}
                style={{
                  marginRight: 8,
                  backgroundColor: token.colorPrimary,
                }}
              />
              <div className="flex flex-col">
                <Text strong>{user?.fullName}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {user?.roleCode}
                </Text>
              </div>
            </div>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: "10px",
            paddingTop: 5,
            padding: 20,
            background: token.colorBgContainer,
            minHeight: 280,
            borderRadius: token.borderRadius,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
