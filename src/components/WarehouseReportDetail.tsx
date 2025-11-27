"use client";

import WrapperContent from "@/components/WrapperContent";
import { usePermissions } from "@/hooks/usePermissions";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { Tag } from "antd";
import { useEffect, useState } from "react";

interface WarehouseReportDetailProps {
  warehouseId: number;
}

interface WarehouseData {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: "NVL" | "THANH_PHAM";
  branchId: number;
  branchName: string;
}

interface BalanceItem {
  itemCode: string;
  itemName: string;
  itemType: string;
  quantity: number;
  unit: string;
}

interface Transaction {
  id: number;
  transactionDate: string;
  transactionType: string;
  referenceCode: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  notes?: string;
  createdBy?: string;
}

interface Statistic {
  transactionType: string;
  transactionCount: number;
  totalQuantity: number;
}

export default function WarehouseReportDetail({
  warehouseId,
}: WarehouseReportDetailProps) {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [warehouse, setWarehouse] = useState<WarehouseData | null>(null);
  const [currentBalance, setCurrentBalance] = useState<BalanceItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statistics, setStatistics] = useState<Statistic[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (!can("inventory.balance", "view")) {
      setLoading(false);
      return;
    }
    fetchReportData();
  }, [warehouseId, dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        warehouseId: warehouseId.toString(),
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      const res = await fetch(`/api/inventory/reports/warehouse?${params}`);
      const body = await res.json();
      if (body.success) {
        setWarehouse(body.data.warehouse);
        setCurrentBalance(body.data.currentBalance || []);
        setTransactions(body.data.transactions || []);
        setStatistics(body.data.statistics || []);
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    alert("Chức năng xuất PDF đang được phát triển");
  };

  const handleRefresh = () => {
    fetchReportData();
  };

  // Tính toán thống kê
  const totalItems = currentBalance.length;
  const totalQuantity = currentBalance.reduce(
    (sum, item) => sum + parseFloat(item.quantity.toString() || "0"),
    0
  );

  const importStat = statistics.find((s) => s.transactionType === "IMPORT");
  const exportStat = statistics.find((s) => s.transactionType === "EXPORT");
  const transferInStat = statistics.find(
    (s) => s.transactionType === "TRANSFER_IN"
  );
  const transferOutStat = statistics.find(
    (s) => s.transactionType === "TRANSFER_OUT"
  );

  const getTransactionTypeLabel = (type: string) => {
    const typeMap: Record<string, { text: string; color: string }> = {
      IMPORT: { text: "Nhập", color: "green" },
      EXPORT: { text: "Xuất", color: "red" },
      TRANSFER_IN: { text: "Chuyển đến", color: "blue" },
      TRANSFER_OUT: { text: "Chuyển đi", color: "orange" },
    };
    return typeMap[type] || { text: type, color: "default" };
  };

  return (
    <>
      <WrapperContent
        title={`Báo cáo kho: ${warehouse?.warehouseName || ""}`}
        isNotAccessible={!can("inventory.balance", "view")}
        isLoading={loading}
        header={{
          buttonEnds: [
            {
              type: "default",
              name: "Làm mới",
              onClick: handleRefresh,
              icon: <ReloadOutlined />,
            },
            {
              type: "primary",
              name: "Xuất PDF",
              onClick: handleExportPDF,
              icon: <DownloadOutlined />,
            },
          ],
        }}
      >
        <div className="space-y-6">
          {/* Warehouse Info */}
          {warehouse && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm text-gray-600">Mã kho: </span>
                  <span className="font-medium">{warehouse.warehouseCode}</span>
                </div>
                <div>
                  <Tag
                    color={
                      warehouse.warehouseType === "NVL" ? "purple" : "green"
                    }
                  >
                    {warehouse.warehouseType === "NVL"
                      ? "Nguyên vật liệu"
                      : "Thành phẩm"}
                  </Tag>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Chi nhánh: </span>
                  <span className="font-medium">{warehouse.branchName}</span>
                </div>
              </div>
            </div>
          )}

          {/* Date Range Filter */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, endDate: e.target.value })
                  }
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-600 mb-1">Số mặt hàng</div>
              <div className="text-2xl font-bold text-blue-700">
                {totalItems}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-purple-600 mb-1">Tổng tồn kho</div>
              <div className="text-2xl font-bold text-purple-700">
                {totalQuantity.toFixed(2)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-600 mb-1">Số lần nhập</div>
              <div className="text-2xl font-bold text-green-700">
                {importStat?.transactionCount || 0}
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <div className="text-sm text-red-600 mb-1">Số lần xuất</div>
              <div className="text-2xl font-bold text-red-700">
                {exportStat?.transactionCount || 0}
              </div>
            </div>
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-4 border border-cyan-200">
              <div className="text-sm text-cyan-600 mb-1">Chuyển đến</div>
              <div className="text-2xl font-bold text-cyan-700">
                {transferInStat?.transactionCount || 0}
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="text-sm text-orange-600 mb-1">Chuyển đi</div>
              <div className="text-2xl font-bold text-orange-700">
                {transferOutStat?.transactionCount || 0}
              </div>
            </div>
          </div>

          {/* Current Balance Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Tồn kho hiện tại</h3>
            <div className="overflow-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Mã
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Tên
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                      Số lượng
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                      Đơn vị
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentBalance.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{item.itemCode}</td>
                      <td className="px-4 py-2 text-sm">{item.itemName}</td>
                      <td className="px-4 py-2 text-sm text-right font-medium">
                        {parseFloat(item.quantity.toString()).toLocaleString(
                          "vi-VN",
                          { minimumFractionDigits: 2, maximumFractionDigits: 3 }
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-center">
                        {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transaction History Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              Lịch sử giao dịch (100 giao dịch gần nhất)
            </h3>
            <div className="overflow-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Ngày
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Loại
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Mã chứng từ
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Mã hàng
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Tên hàng
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                      Số lượng
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                      ĐVT
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Người tạo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((txn) => {
                    const typeInfo = getTransactionTypeLabel(
                      txn.transactionType
                    );
                    return (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">
                          {new Date(txn.transactionDate).toLocaleDateString(
                            "vi-VN"
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {txn.referenceCode}
                        </td>
                        <td className="px-4 py-2 text-sm">{txn.itemCode}</td>
                        <td className="px-4 py-2 text-sm">{txn.itemName}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          {parseFloat(txn.quantity.toString()).toLocaleString(
                            "vi-VN",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 3,
                            }
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-center">
                          {txn.unit}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {txn.createdBy || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </WrapperContent>
    </>
  );
}
