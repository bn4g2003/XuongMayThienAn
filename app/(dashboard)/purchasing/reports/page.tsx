'use client';

import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface PurchasingSummary {
  totalOrders: number;
  totalAmount: number;
  totalPaid: number;
  totalUnpaid: number;
  pendingOrders: number;
  approvedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  topSuppliers: Array<{
    id: number;
    supplierCode: string;
    supplierName: string;
    totalOrders: number;
    totalAmount: number;
  }>;
  topProducts: Array<{
    id: number;
    productCode: string;
    productName: string;
    unit: string;
    totalQuantity: number;
    totalAmount: number;
  }>;
}

interface MonthlyData {
  month: string;
  orders: number;
  amount: number;
  paid: number;
  unpaid: number;
}

interface DailyData {
  date: string;
  orders: number;
  amount: number;
}

export default function PurchasingReportsPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PurchasingSummary>({
    totalOrders: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalUnpaid: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    topSuppliers: [],
    topProducts: [],
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!can('purchasing.orders', 'view')) {
      setLoading(false);
      return;
    }
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch summary
      const summaryRes = await fetch(`/api/purchasing/reports/summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const summaryData = await summaryRes.json();
      if (summaryData.success) {
        setSummary(summaryData.data);
      }

      // Fetch monthly trend
      const monthlyRes = await fetch(`/api/purchasing/reports/monthly?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const monthlyDataRes = await monthlyRes.json();
      if (monthlyDataRes.success) {
        setMonthlyData(monthlyDataRes.data);
      }

      // Fetch daily trend
      const dailyRes = await fetch(`/api/purchasing/reports/daily?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const dailyDataRes = await dailyRes.json();
      if (dailyDataRes.success) {
        setDailyData(dailyDataRes.data);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    alert('Chức năng xuất PDF đang được phát triển');
  };

  const handleRefresh = () => {
    fetchReportData();
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const orderStatusData = [
    { name: 'Đã giao hàng', value: summary.completedOrders, color: '#10B981' },
    { name: 'Đã duyệt', value: summary.approvedOrders, color: '#3B82F6' },
    { name: 'Chờ duyệt', value: summary.pendingOrders, color: '#F59E0B' },
    { name: 'Đã hủy', value: summary.cancelledOrders, color: '#EF4444' },
  ].filter(item => item.value > 0);

  return (
    <>
      <WrapperContent
        title="Báo cáo mua hàng"
        isNotAccessible={!can('purchasing.orders', 'view')}
        isLoading={loading}
        header={{
          buttonEnds: [
            {
              type: 'default',
              name: 'Làm mới',
              onClick: handleRefresh,
              icon: <ReloadOutlined />,
            },
            {
              type: 'primary',
              name: 'Xuất PDF',
              onClick: handleExportPDF,
              icon: <DownloadOutlined />,
            },
          ],
        }}
      >
        <div className="space-y-6">
          {/* Date Range Filter */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <button
                onClick={fetchReportData}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Áp dụng
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-600 mb-1">Tổng đơn mua</div>
              <div className="text-2xl font-bold text-blue-700">
                {summary.totalOrders}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {summary.completedOrders} đã giao hàng
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="text-sm text-orange-600 mb-1">Tổng giá trị</div>
              <div className="text-2xl font-bold text-orange-700">
                {summary.totalAmount.toLocaleString()} đ
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-600 mb-1">Đã thanh toán</div>
              <div className="text-2xl font-bold text-green-700">
                {summary.totalPaid.toLocaleString()} đ
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <div className="text-sm text-red-600 mb-1">Còn nợ NCC</div>
              <div className="text-2xl font-bold text-red-700">
                {summary.totalUnpaid.toLocaleString()} đ
              </div>
            </div>
          </div>

          {/* Monthly Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Xu hướng mua hàng theo tháng</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString() + ' đ'} />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#F97316" name="Giá trị mua" strokeWidth={2} />
                <Line type="monotone" dataKey="paid" stroke="#10B981" name="Đã thanh toán" strokeWidth={2} />
                <Line type="monotone" dataKey="unpaid" stroke="#EF4444" name="Còn nợ" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Purchase Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Giá trị mua hàng theo ngày</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString() + ' đ'} />
                <Legend />
                <Bar dataKey="amount" fill="#F97316" name="Giá trị mua" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Order Status Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Trạng thái đơn mua</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Suppliers and Products */}
          <div className="grid grid-cols-2 gap-6">
            {/* Top Suppliers */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Top 10 nhà cung cấp</h3>
              <div className="overflow-auto max-h-96">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mã NCC</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tên NCC</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Số ĐH</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Giá trị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {summary.topSuppliers.map((supplier, index) => (
                      <tr key={supplier.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">
                          <span className="font-medium text-blue-600">#{index + 1}</span> {supplier.supplierCode}
                        </td>
                        <td className="px-4 py-2 text-sm">{supplier.supplierName}</td>
                        <td className="px-4 py-2 text-sm text-center">{supplier.totalOrders}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-orange-600">
                          {parseFloat(supplier.totalAmount.toString()).toLocaleString()} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Top 10 sản phẩm mua nhiều</h3>
              <div className="overflow-auto max-h-96">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mã SP</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tên SP</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">SL mua</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Giá trị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {summary.topProducts.map((product, index) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">
                          <span className="font-medium text-blue-600">#{index + 1}</span> {product.productCode}
                        </td>
                        <td className="px-4 py-2 text-sm">{product.productName}</td>
                        <td className="px-4 py-2 text-sm text-center">
                          {parseFloat(product.totalQuantity.toString()).toLocaleString()} {product.unit}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-orange-600">
                          {parseFloat(product.totalAmount.toString()).toLocaleString()} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </WrapperContent>
    </>
  );
}
