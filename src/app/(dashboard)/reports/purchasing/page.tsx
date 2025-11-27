/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useFilter from "@/hooks/useFilter";
import { buildQueryParams } from "@/utils/buildQuery";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Col, Row, Statistic } from "antd";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SuperJSON from "superjson";

const STATUS_OPTIONS = [
  { label: "Chờ duyệt", value: "PENDING" },
  { label: "Đã duyệt", value: "APPROVED" },
  { label: "Hoàn thành", value: "COMPLETED" },
  { label: "Đã hủy", value: "CANCELLED" },
];

const FILTER_FIELDS = [
  {
    name: "startDate",
    label: "Từ ngày",
    type: "date" as const,
  },
  {
    name: "endDate",
    label: "Đến ngày",
    type: "date" as const,
  },
  {
    name: "supplierId",
    label: "Nhà cung cấp",
    type: "select" as const,
    multiple: true,
    apiEndpoint: "/api/suppliers",
    optionValue: "id",
    optionLabel: "supplier_name",
  },
  {
    name: "branchId",
    label: "Chi nhánh",
    type: "select" as const,
    multiple: true,
    apiEndpoint: "/api/branches",
    optionValue: "id",
    optionLabel: "branch_name",
  },
  {
    name: "status",
    label: "Trạng thái",
    type: "select" as const,
    multiple: true,
    options: STATUS_OPTIONS,
  },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const STATUS_COLORS = {
  PENDING: "#faad14",
  APPROVED: "#1890ff",
  COMPLETED: "#52c41a",
  CANCELLED: "#ff4d4f",
};

const STATUS_ICONS = {
  PENDING: <ClockCircleOutlined />,
  APPROVED: <CheckCircleOutlined />,
  COMPLETED: <CheckCircleOutlined />,
  CANCELLED: <CloseCircleOutlined />,
};

export default function PurchasingReportPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  const { query, pagination, updateQueries, reset, handlePageChange } =
    useFilter({
      startDate: from,
      endDate: to,
    });
  const [columnSettings, setColumnSettings] = useState([
    {
      key: "purchase_order_code",
      title: "Mã đơn",
      width: 120,
      fixed: "left",
      visible: true,
    },
    { key: "supplier_name", title: "Nhà cung cấp", width: 200, visible: true },
    { key: "order_date", title: "Ngày đặt", width: 120, visible: true },
    {
      key: "total_amount",
      title: "Tổng tiền",
      width: 150,
      align: "right",
      visible: true,
    },
    { key: "status", title: "Trạng thái", width: 120, visible: true },
    { key: "branch_name", title: "Chi nhánh", width: 150, visible: true },
    {
      key: "created_by",
      title: "Người tạo",
      width: 150,
      fixed: "right",
      visible: true,
    },
  ]);

  const resetColumnSettings = () => {
    setColumnSettings([
      {
        key: "purchase_order_code",
        title: "Mã đơn",
        width: 120,
        fixed: "left",
        visible: true,
      },
      {
        key: "supplier_name",
        title: "Nhà cung cấp",
        width: 200,
        visible: true,
      },
      { key: "order_date", title: "Ngày đặt", width: 120, visible: true },
      {
        key: "total_amount",
        title: "Tổng tiền",
        width: 150,
        align: "right",
        visible: true,
      },
      { key: "status", title: "Trạng thái", width: 120, visible: true },
      { key: "branch_name", title: "Chi nhánh", width: 150, visible: true },
      {
        key: "created_by",
        title: "Người tạo",
        width: 150,
        fixed: "right",
        visible: true,
      },
    ]);
  };

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["purchasing-summary", SuperJSON.stringify(query)],
    queryFn: async () => {
      const qs = buildQueryParams({ ...query, type: "summary" });
      const res = await fetch(`/api/reports/purchasing?${qs}`);
      const body = await res.json();
      return body.success ? body.data : null;
    },
  });

  const {
    data: listData,
    isLoading: listLoading,
    isRefetching,
  } = useQuery({
    queryKey: ["purchasing-list", SuperJSON.stringify(query)],
    queryFn: async () => {
      const qs = buildQueryParams({ ...query, ...pagination });
      const res = await fetch(`/api/reports/purchasing?${qs}`);
      const body = await res.json();
      return body.success ? body.data : null;
    },
  });

  const summary = summaryData;
  const orders = listData;

  const statusChartData =
    summary?.statusSummary?.map((item: any) => ({
      name:
        STATUS_OPTIONS.find((opt) => opt.value === item.status)?.label ||
        item.status,
      value: item._count.id,
      amount: Number(item._sum.total_amount || 0),
    })) || [];

  const monthlyChartData =
    summary?.monthlySummary?.map((item: any) => ({
      month: new Date(item.month).toLocaleDateString("vi-VN", {
        month: "short",
        year: "numeric",
      }),
      orders: Number(item.order_count),
      amount: Number(item.total_amount),
    })) || [];

  const columns = columnSettings.map((col) => ({
    title: col.title,
    dataIndex: col.key,
    key: col.key,
    width: col.width,
    fixed: col.fixed as any,
    align: col.align as any,
    render: (value: any, record: any) => {
      if (col.key === "supplier_name") {
        return record.suppliers?.supplier_name || "";
      }
      if (col.key === "branch_name") {
        return record.branches?.branch_name || "";
      }
      if (col.key === "created_by") {
        return record.users?.full_name || record.users?.username || "";
      }
      if (col.key === "total_amount") {
        return formatCurrency(value);
      }
      if (col.key === "order_date") {
        return new Date(value).toLocaleDateString("vi-VN");
      }
      if (col.key === "status") {
        return (
          <span
            style={{
              color: STATUS_COLORS[value as keyof typeof STATUS_COLORS],
            }}
          >
            {STATUS_ICONS[value as keyof typeof STATUS_ICONS]}{" "}
            {STATUS_OPTIONS.find((opt) => opt.value === value)?.label || value}
          </span>
        );
      }
      return value;
    },
  }));

  return (
    <WrapperContent
      header={{
        searchInput: {
          placeholder: "Tìm kiếm theo mã đơn hoặc nhà cung cấp",
          filterKeys: ["purchase_order_code", "suppliers.supplier_name"],
        },
        filters: {
          fields: FILTER_FIELDS,
          query,
          onApplyFilter: updateQueries,
          onReset: reset,
        },
        refetchDataWithKeys: ["purchasing-summary", "purchasing-list"],
      }}
      isLoading={summaryLoading}
      isRefetching={isRefetching}
    >
      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng đơn hàng"
              value={summary?.totalOrders || 0}
              prefix={<ExclamationCircleOutlined />}
              styles={{ content: { color: "#1890ff" } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng giá trị"
              value={summary?.totalAmount || 0}
              prefix="₫"
              formatter={(value) => formatCurrency(Number(value))}
              styles={{ content: { color: "#52c41a" } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đơn chờ duyệt"
              value={
                summary?.statusSummary?.find((s: any) => s.status === "PENDING")
                  ?._count?.id || 0
              }
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: "#faad14" } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đơn hoàn thành"
              value={
                summary?.statusSummary?.find(
                  (s: any) => s.status === "COMPLETED"
                )?._count?.id || 0
              }
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: "#52c41a" } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="Phân bố trạng thái đơn hàng">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Doanh số mua hàng theo tháng">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="amount" fill="#8884d8" name="Tổng giá trị" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <CommonTable
        columns={columns}
        dataSource={orders}
        pagination={{
          ...pagination,
          total: listData?.pagination?.total || 0,
          onChange: handlePageChange,
        }}
        loading={listLoading}
        paging
      />
    </WrapperContent>
  );
}
