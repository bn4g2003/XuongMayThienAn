"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useFilter from "@/hooks/useFilter";
import { FilterField } from "@/types";
import { buildQueryParams } from "@/utils/buildQuery";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  DollarOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { Card, Col, Row, Statistic, Tag, Tooltip } from "antd";
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

const FILTER_FIELDS: FilterField[] = [
  {
    name: "dateRange",
    label: "Chọn ngày",
    type: "dateRange",
    placeholder: "Chọn tháng",
  },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

interface CustomerSummary {
  totalCustomers: number;
  totalDebt: number;
  customersByGroup: Array<{
    groupName: string;
    count: number;
  }>;
  customersByBranch: Array<{
    branchName: string;
    count: number;
  }>;
}

interface CustomerDetail {
  id: number;
  customer_code: string;
  customer_name: string;
  phone?: string;
  email?: string;
  address?: string;
  group_name?: string;
  price_multiplier: number;
  branch_name?: string;
  debt_amount: number;
  total_orders: number;
  last_order_date?: string;
  total_order_value: number;
  active_debts: number;
  total_debt_remaining: number;
  created_at?: string;
}

export default function CustomerReportPage() {
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
  const {
    query,
    pagination: basePagination,
    updateQueries,
    handlePageChange,
  } = filter;

  const {
    data: summary,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
  } = useQuery<CustomerSummary>({
    queryKey: ["customer-report-summary", SuperJSON.stringify(query)],
    queryFn: async () => {
      const qs = buildQueryParams({ ...query, type: "summary" });
      const res = await fetch(`/api/reports/customers?${qs}`);
      const body = await res.json();
      if (!body.success) {
        throw new Error(body.error || "Failed to fetch summary");
      }
      return body.data;
    },
  });

  const {
    data: customersData,
    isLoading: customersLoading,
    isFetching: customersFetching,
  } = useQuery<{
    data: CustomerDetail[];
    total: number;
  }>({
    queryKey: ["customer-report-list", query],
    queryFn: async () => {
      const qs = buildQueryParams(query);
      const res = await fetch(`/api/reports/customers?${qs}`);
      const body = await res.json();
      if (!body.success) {
        throw new Error(body.error || "Failed to fetch customers");
      }
      return body.data;
    },
  });

  const customers = customersData?.data || [];
  const pagination = { ...basePagination, total: customersData?.total || 0 };

  const columns: TableColumnsType<CustomerDetail> = [
    {
      title: "Mã KH",
      dataIndex: "customer_code",
      key: "customer_code",
      width: 100,
      fixed: "left",
    },
    {
      title: "Tên khách hàng",
      dataIndex: "customer_name",
      key: "customer_name",
      width: 200,
      fixed: "left",
    },
    {
      title: "Nhóm",
      dataIndex: "group_name",
      key: "group_name",
      width: 120,
      render: (value) => (value ? <Tag color="blue">{value}</Tag> : "-"),
    },
    {
      title: "Chi nhánh",
      dataIndex: "branch_name",
      key: "branch_name",
      width: 160,
      render: (value) => (value ? <Tag color="green">{value}</Tag> : "-"),
    },
    {
      title: "SĐT",
      dataIndex: "phone",
      key: "phone",
      width: 120,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 180,
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      key: "address",
      width: 200,
      render: (value) => (
        <Tooltip title={value || "-"}>
          <span className="truncate block max-w-[180px]">{value || "-"}</span>
        </Tooltip>
      ),
    },
    {
      title: "Nợ hiện tại",
      dataIndex: "debt_amount",
      key: "debt_amount",
      width: 120,
      align: "right",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Tổng đơn hàng",
      dataIndex: "total_orders",
      key: "total_orders",
      width: 120,
      align: "center",
    },
    {
      title: "Tổng giá trị",
      dataIndex: "total_order_value",
      key: "total_order_value",
      width: 140,
      align: "right",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Đơn hàng cuối",
      dataIndex: "last_order_date",
      key: "last_order_date",
      width: 120,
      render: (value) =>
        value ? new Date(value).toLocaleDateString("vi-VN") : "-",
    },
    {
      title: "Nợ còn lại",
      dataIndex: "total_debt_remaining",
      key: "total_debt_remaining",
      width: 120,
      align: "right",
      render: (value) => formatCurrency(value),
    },
  ];

  return (
    <WrapperContent
      header={{
        searchInput: {
          placeholder: "Tìm kiếm khách hàng",
          filterKeys: ["customer_name", "customer_code", "phone", "email"],
        },
        filters: {
          fields: FILTER_FIELDS,
          query,
          onApplyFilter: updateQueries,
        },
        refetchDataWithKeys: [
          "customer-report-summary",
          "customer-report-list",
        ],
      }}
      isLoading={summaryLoading}
      isRefetching={customersFetching}
      isEmpty={!summary}
    >
      {/* Summary Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng khách hàng"
              value={summary?.totalCustomers || 0}
              prefix={<UserOutlined />}
              styles={{
                content: { color: "#3f8600" },
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng nợ"
              value={summary?.totalDebt || 0}
              prefix={<DollarOutlined />}
              styles={{ content: { color: "#cf1322" } }}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Nhóm khách hàng"
              value={summary?.customersByGroup.length || 0}
              prefix={<TeamOutlined />}
              styles={{ content: { color: "#1890ff" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Chi nhánh"
              value={summary?.customersByBranch.length || 0}
              prefix={<ShopOutlined />}
              styles={{ content: { color: "#722ed1" } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} md={12}>
          <Card title="Khách hàng theo nhóm">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={
                    summary?.customersByGroup.map((g) => ({
                      name: g.groupName,
                      value: g.count,
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
                  {(summary?.customersByGroup || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#000",
                    color: "#fff",
                    border: "1px solid #ccc",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Khách hàng theo chi nhánh">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={
                  summary?.customersByBranch.map((b) => ({
                    name: b.branchName,
                    count: b.count,
                  })) || []
                }
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#000",
                    color: "#fff",
                    border: "1px solid #ccc",
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Detailed Table */}
      <Card title="Danh sách khách hàng chi tiết" className="mt-6">
        <CommonTable
          columns={columns}
          dataSource={customers}
          pagination={{
            ...pagination,
            onChange: handlePageChange,
          }}
          loading={customersLoading}
          paging
        />
      </Card>
    </WrapperContent>
  );
}
