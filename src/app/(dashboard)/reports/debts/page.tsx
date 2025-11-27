"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useFilter from "@/hooks/useFilter";
import { FilterField } from "@/types";
import { buildQueryParams } from "@/utils/buildQuery";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  DollarOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { Card, Col, Row, Statistic, Tag } from "antd";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import SuperJSON from "superjson";

interface DebtSummary {
  totalDebts: number;
  totalOriginalAmount: number;
  totalRemainingAmount: number;
  debtsByType: Array<{
    type: string;
    count: number;
    amount: number;
  }>;
  debtsByStatus: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  overdueDebts: number;
}

interface DebtDetail {
  id: number;
  debt_code: string;
  debt_type: string;
  customer?: {
    code: string;
    name: string;
    phone?: string;
    branch?: string;
  };
  supplier?: {
    code: string;
    name: string;
    phone?: string;
    branch?: string;
  };
  original_amount: number;
  remaining_amount: number;
  due_date?: string;
  status: string;
  created_at: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function DebtReportPage() {
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

  const qs = buildQueryParams(query);

  // Fetch filter options
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/branches");
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  const filterFields = useMemo(() => {
    const baseFields: FilterField[] = [
      {
        name: "dateRange",
        label: "Khoảng thời gian",
        type: "dateRange",
        placeholder: "Từ ngày - Đến ngày",
      },
      {
        name: "branch_id",
        label: "Chi nhánh",
        type: "select",
        placeholder: "Chọn chi nhánh",
        options:
          branches?.map((branch: { id: number; branchName: string }) => ({
            label: branch.branchName,
            value: branch.id,
          })) || [],
      },
      {
        name: "debt_type",
        label: "Loại công nợ",
        type: "select",
        placeholder: "Chọn loại",
        options: [
          { label: "Khách hàng", value: "CUSTOMER" },
          { label: "Nhà cung cấp", value: "SUPPLIER" },
        ],
      },
      {
        name: "status",
        label: "Trạng thái",
        type: "select",
        placeholder: "Chọn trạng thái",
        options: [
          { label: "Chưa thanh toán", value: "PENDING" },
          { label: "Đã thanh toán", value: "PAID" },
          { label: "Quá hạn", value: "OVERDUE" },
        ],
      },
    ];
    return baseFields;
  }, [branches]);

  // Fetch summary data
  const {
    data: summaryData,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
  } = useQuery({
    queryKey: ["debts-summary", SuperJSON.stringify(query)],
    queryFn: async () => {
      const res = await fetch(`/api/reports/debts?type=summary&${qs}`);
      const body = await res.json();
      return body.success ? body.data : null;
    },
  });

  // Fetch detail data
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["debts-detail", SuperJSON.stringify(query)],
    queryFn: async () => {
      const res = await fetch(`/api/reports/debts?type=list&${qs}`);
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  const summary: DebtSummary | null = summaryData;
  const debts: DebtDetail[] = detailData || [];

  // Prepare chart data
  const debtsByTypeChart =
    summary?.debtsByType.map((item, index) => ({
      name:
        item.type === "CUSTOMER"
          ? "Khách hàng"
          : item.type === "SUPPLIER"
          ? "Nhà cung cấp"
          : "Khác",
      value: Number(item.amount),
      count: item.count,
      fill: COLORS[index % COLORS.length],
    })) || [];


  const debtsByStatusChart =
    summary?.debtsByStatus.map((item, index) => ({
      name:
        item.status === "PENDING"
          ? "Chưa thanh toán"
          : item.status === "PAID"
          ? "Đã thanh toán"
          : "Quá hạn",
      value: item.amount,
      count: item.count,
      fill: COLORS[index % COLORS.length],
    })) || [];

  const columns: TableColumnsType<DebtDetail> = [
    {
      title: "Mã công nợ",
      dataIndex: "debt_code",
      key: "debt_code",
      width: 120,
      fixed: "left",
    },
    {
      title: "Loại",
      dataIndex: "debt_type",
      key: "debt_type",
      width: 120,
      render: (type: string) => (
        <Tag
          color={
            type === "CUSTOMER"
              ? "blue"
              : type === "SUPPLIER"
              ? "green"
              : "gray"
          }
        >
          {type === "CUSTOMER"
            ? "Khách hàng"
            : type === "SUPPLIER"
            ? "Nhà cung cấp"
            : "Không xác định"}
        </Tag>
      ),
    },
    {
      title: "Khách hàng/NCC",
      key: "party",
      width: 200,
      render: (_, record) => {
        const party = record.customer || record.supplier;
        return party ? (
          <div>
            <div className="font-medium">{party.name}</div>
            <div className="text-sm text-gray-500">{party.code}</div>
            {party.phone && (
              <div className="text-sm text-gray-500">{party.phone}</div>
            )}
          </div>
        ) : (
          "-"
        );
      },
    },
    {
      title: "Chi nhánh",
      key: "branch",
      width: 120,
      render: (_, record) => {
        const party = record.customer || record.supplier;
        return party?.branch || "-";
      },
    },
    {
      title: "Tiền gốc",
      dataIndex: "original_amount",
      key: "original_amount",
      width: 120,
      align: "right",
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: "Tiền còn lại",
      dataIndex: "remaining_amount",
      key: "remaining_amount",
      width: 120,
      align: "right",
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: "Hạn",
      dataIndex: "due_date",
      key: "due_date",
      width: 120,
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString("vi-VN") : "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => {
        const color =
          status === "PAID" ? "green" : status === "PENDING" ? "orange" : "red";
        const text =
          status === "PAID"
            ? "Đã thanh toán"
            : status === "PENDING"
            ? "Chưa thanh toán"
            : "Quá hạn";
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      fixed: "right",
      render: (date: string) => new Date(date).toLocaleDateString("vi-VN"),
    },
  ];

  return (
    <WrapperContent
      header={{
        searchInput: {
          placeholder: "Tìm kiếm theo mã công nợ, tên khách hàng/NCC",
          filterKeys: ["debt_code", "customer.name", "supplier.name"],
        },
        filters: {
          fields: filterFields,
          query,
          onApplyFilter: updateQueries,
          onReset: () => filter.reset(),
        },
        refetchDataWithKeys: ["debts-summary", "debts-detail"],
      }}
      isLoading={summaryLoading}
      isRefetching={summaryFetching}
    >
      {/* Summary Cards */}
      <Row gutter={16} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng công nợ"
              value={summary?.totalDebts || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng tiền gốc"
              value={summary?.totalOriginalAmount || 0}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng tiền còn lại"
              value={summary?.totalRemainingAmount || 0}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Công nợ quá hạn"
              value={summary?.overdueDebts || 0}
              prefix={<ExclamationCircleOutlined />}
              styles={{ content: { color: "#cf1322" } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={16} className="mb-6">
        <Col xs={24} lg={12}>
          <Card title="Công nợ theo loại">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={debtsByTypeChart}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent = 0 }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {debtsByTypeChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value) => formatCurrency(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Công nợ theo trạng thái">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={debtsByStatusChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <RechartsTooltip
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <CommonTable
        columns={columns}
        dataSource={debts}
        pagination={{
          ...basePagination,
          onChange: handlePageChange,
        }}
        loading={detailLoading}
        paging
      />
    </WrapperContent>
  );
}
