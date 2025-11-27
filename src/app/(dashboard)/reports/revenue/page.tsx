/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useFilter from "@/hooks/useFilter";
import { buildQueryParams } from "@/utils/buildQuery";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  DollarOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Col, Row, Statistic, Tag } from "antd";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import SuperJSON from "superjson";

interface Branch {
  id: number;
  branch_name: string;
}

interface Customer {
  id: number;
  customer_code: string;
  customer_name: string;
}

interface RevenueSummary {
  totalRevenue: number;
  totalOrders: number;
  revenueByBranch: Array<{
    branchName: string;
    revenue: number;
    orders: number;
  }>;
  revenueByCustomer: Array<{
    customerName: string;
    revenue: number;
    orders: number;
  }>;
}

interface Product {
  product_name?: string;
  product_code?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

interface RevenueDetail {
  id: number;
  order_code: string;
  order_date: string;
  customer_name?: string;
  customer_code?: string;
  branch_name?: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_status?: string;
  created_by?: string;
  products: Product[];
  created_at?: string;
}

export default function RevenueReportPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);

  const filter = useFilter({
    dateRange: {
      from,
      to,
    },
  });
  console.log(filter.query, "sdfsdfsdfsfsdfdfvvv");
  const {
    query,
    pagination: basePagination,
    updateQueries,
    handlePageChange,
  } = filter;

  const qs = buildQueryParams(query);

  const [columnSettings, setColumnSettings] = useState([
    { key: "order_code", title: "Mã đơn", visible: true },
    { key: "customer_name", title: "Khách hàng", visible: true },
    { key: "order_date", title: "Ngày đặt", visible: true },
    { key: "total_amount", title: "Tổng tiền", visible: true },
    { key: "discount_amount", title: "Giảm giá", visible: true },
    { key: "final_amount", title: "Thành tiền", visible: true },
    { key: "payment_status", title: "Trạng thái TT", visible: true },
    { key: "branch_name", title: "Chi nhánh", visible: true },
    { key: "created_by", title: "Người tạo", visible: true },
    { key: "products", title: "Sản phẩm", visible: true },
  ]);

  const resetColumnSettings = () => {
    setColumnSettings([
      { key: "order_code", title: "Mã đơn", visible: true },
      { key: "customer_name", title: "Khách hàng", visible: true },
      { key: "order_date", title: "Ngày đặt", visible: true },
      { key: "total_amount", title: "Tổng tiền", visible: true },
      { key: "discount_amount", title: "Giảm giá", visible: true },
      { key: "final_amount", title: "Thành tiền", visible: true },
      { key: "payment_status", title: "Trạng thái TT", visible: true },
      { key: "branch_name", title: "Chi nhánh", visible: true },
      { key: "created_by", title: "Người tạo", visible: true },
      { key: "products", title: "Sản phẩm", visible: true },
    ]);
  };

  // Fetch filter options
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/branches");
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/sales/customers");
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  const FILTER_FIELDS = [
    {
      name: "create",
      label: "Chọn ngày",
      type: "dateRange" as const,
      placeholder: "Chọn khoảng thời gian",
    },
    {
      name: "branch_id",
      label: "Chi nhánh",
      type: "select" as const,
      placeholder: "Chọn chi nhánh",
      options:
        branches?.map((b: Branch) => ({ label: b.branch_name, value: b.id })) ||
        [],
    },
    {
      name: "customer_id",
      label: "Khách hàng",
      type: "select" as const,
      placeholder: "Chọn khách hàng",
      options:
        customers?.map((c: Customer) => ({
          label: `${c.customer_code} - ${c.customer_name}`,
          value: c.id,
        })) || [],
    },
  ];

  const {
    data: summary,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
  } = useQuery<RevenueSummary>({
    queryKey: ["revenue-report-summary", SuperJSON.stringify(query)],
    queryFn: async () => {
      const res = await fetch(`/api/reports/revenue?type=summary&${qs}`);
      const body = await res.json();
      if (!body.success) {
        throw new Error(body.error || "Failed to fetch summary");
      }
      return body.data;
    },
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery<{
    data: RevenueDetail[];
    total: number;
  }>({
    queryKey: ["revenue-report-list", SuperJSON.stringify(query)],
    queryFn: async () => {
      const res = await fetch(`/api/reports/revenue?${qs}`);
      const body = await res.json();
      if (!body.success) {
        throw new Error(body.error || "Failed to fetch revenue");
      }
      return body.data;
    },
  });

  const revenue = revenueData?.data ?? [];
  const pagination = { ...basePagination, total: revenueData?.total || 0 };

  const columnConfig: Record<
    string,
    { width: number; fixed?: "left" | "right"; align?: "left" | "right" }
  > = {
    order_code: { width: 120, fixed: "left" },
    customer_name: { width: 200 },
    order_date: { width: 100 },
    total_amount: { width: 120, align: "right" },
    discount_amount: { width: 100, align: "right" },
    final_amount: { width: 120, align: "right" },
    payment_status: { width: 120 },
    branch_name: { width: 150 },
    created_by: { width: 100, fixed: "right" },
    products: { width: 250 },
  };

  const columns = columnSettings
    .filter((col) => col.visible)
    .map((col) => {
      const config = columnConfig[col.key as keyof typeof columnConfig] || {};
      return {
        title: col.title,
        dataIndex: col.key,
        key: col.key,
        width: config.width,
        fixed: config.fixed,
        align: config.align,
        render: (value: any, record: any) => {
          if (col.key === "order_date") {
            return value ? new Date(value).toLocaleDateString("vi-VN") : "-";
          }
          if (col.key === "customer_name") {
            return (
              <div>
                <div className="font-medium">{value || "-"}</div>
                {record.customer_code && (
                  <div className="text-xs text-gray-500">
                    {record.customer_code}
                  </div>
                )}
              </div>
            );
          }
          if (col.key === "branch_name") {
            return value ? <Tag color="blue">{value}</Tag> : "-";
          }
          if (col.key === "total_amount" || col.key === "discount_amount") {
            return formatCurrency(value);
          }
          if (col.key === "final_amount") {
            return (
              <span className="font-semibold text-green-600">
                {formatCurrency(value)}
              </span>
            );
          }
          if (col.key === "products") {
            return (
              <div className="max-h-20 overflow-y-auto">
                {value?.map((product: Product, index: number) => (
                  <div key={index} className="text-xs mb-1">
                    <div className="font-medium">
                      {product.product_name || product.product_code}
                    </div>
                    <div className="text-gray-600">
                      SL: {product.quantity} ×{" "}
                      {formatCurrency(product.unit_price)} ={" "}
                      {formatCurrency(product.total_amount)}
                    </div>
                  </div>
                )) || "-"}
              </div>
            );
          }
        },
      };
    });

  return (
    <WrapperContent
      isRefetching={summaryFetching}
      isLoading={summaryLoading}
      header={{
        searchInput: {
          placeholder: "Tìm kiếm đơn hàng",
          filterKeys: ["order_code", "customer_name", "customer_code"],
        },
        filters: {
          fields: FILTER_FIELDS,
          query,
          onApplyFilter: updateQueries,
        },
        columnSettings: {
          columns: columnSettings,
          onChange: setColumnSettings,
          onReset: resetColumnSettings,
        },
        refetchDataWithKeys: ["revenue-report-summary", "revenue-report-list"],
      }}
    >
      {/* Summary Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng doanh thu"
              value={summary?.totalRevenue || 0}
              prefix={<DollarOutlined />}
              styles={{ content: { color: "#3f8600" } }}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng đơn hàng"
              value={summary?.totalOrders || 0}
              prefix={<ShopOutlined />}
              styles={{ content: { color: "#1890ff" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Doanh thu TB/đơn"
              value={
                summary?.totalOrders
                  ? summary.totalRevenue / summary.totalOrders
                  : 0
              }
              prefix={<TeamOutlined />}
              styles={{ content: { color: "#722ed1" } }}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Chi nhánh"
              value={summary?.revenueByBranch.length || 0}
              prefix={<UserOutlined />}
              styles={{ content: { color: "#fa8c16" } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} md={12}>
          <Card title="Doanh thu theo chi nhánh">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={
                    summary?.revenueByBranch.map((b) => ({
                      name: b.branchName,
                      value: b.revenue,
                    })) || []
                  }
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(summary?.revenueByBranch || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"][index % 4]
                      }
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value) => formatCurrency(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Top 10 khách hàng">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={
                  summary?.revenueByCustomer.map((c) => ({
                    name:
                      c.customerName.length > 10
                        ? c.customerName.substring(0, 10) + "..."
                        : c.customerName,
                    revenue: c.revenue,
                  })) || []
                }
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#000",
                    color: "#fff",
                    border: "1px solid #ccc",
                  }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Detailed Table */}
      <Card title="Danh sách đơn hàng chi tiết" className="mt-6">
        <CommonTable
          pagination={{
            ...pagination,
            onChange: handlePageChange,
          }}
          columns={columns}
          dataSource={revenue}
          loading={revenueLoading}
          paging
        />
      </Card>
    </WrapperContent>
  );
}
