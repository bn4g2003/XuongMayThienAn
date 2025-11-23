import {
  AppstoreOutlined,
  DashboardOutlined,
  DollarOutlined,
  InboxOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";

export const allMenuItems: Array<{
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
    children: [], // Sẽ được thêm động từ API
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
        title: "Nhóm khách hàng",
        href: "/sales/customer-groups",
        permission: "sales.customers",
      },
      {
        title: "Đơn hàng",
        href: "/sales/orders",
        permission: "sales.orders",
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
        title: "Danh mục tài chính",
        href: "/finance/categories",
        permission: "finance.categories",
      },
      {
        title: "Tài khoản ngân hàng",
        href: "/finance/bank-accounts",
        permission: "finance.cashbooks",
      },
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
