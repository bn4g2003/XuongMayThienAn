"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { Button, Tag } from "antd";
import { useParams, useRouter } from "next/navigation";

type BalanceItem = {
  warehouseId: number;
  warehouseName: string;
  itemCode: string;
  itemName: string;
  itemType: "NVL" | "THANH_PHAM";
  quantity: number;
  unit: string;
};

export default function PageClient() {
  const params = useParams() as { id?: string };
  const router = useRouter();
  const warehouseId = params?.id;
  const { can } = usePermissions();
  const { reset, applyFilter, updateQueries, query } = useFilter();

  const columnsAll: TableColumnsType<BalanceItem> = [
    { title: "Mã", dataIndex: "itemCode", key: "itemCode", width: 140 },
    { title: "Tên", dataIndex: "itemName", key: "itemName", width: 300 },
    {
      title: "Loại",
      dataIndex: "itemType",
      key: "itemType",
      width: 120,
      render: (t: string) => (
        <Tag color={t === "NVL" ? "purple" : "green"}>
          {t === "NVL" ? "NVL" : "TP"}
        </Tag>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 140,
      align: "right",
      render: (q: number) => q?.toLocaleString() || "0",
    },
    { title: "Đơn vị", dataIndex: "unit", key: "unit", width: 120 },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  const handleExportExcel = () => {
    // TODO: Implement export to Excel functionality
    console.log("Xuất Excel tồn kho");
  };

  const handleImportExcel = () => {
    // TODO: Implement import from Excel functionality
    console.log("Nhập Excel tồn kho");
  };

  const {
    data: balanceData = { details: [], summary: [] },
    isLoading,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey: ["inventory", "balance", warehouseId],
    enabled: !!warehouseId,
    queryFn: async () => {
      const res = await fetch(
        `/api/inventory/balance${
          warehouseId ? `?warehouseId=${warehouseId}` : ""
        }`
      );
      const body = await res.json();

      if (!body.success) {
        throw new Error(body.error || "Failed to fetch balance");
      }

      return body.data;
    },
  });

  if (!can("inventory.balance", "view")) {
    return <div className="text-center py-12">🔒 Không có quyền truy cập</div>;
  }

  if (!warehouseId) {
    return (
      <div className="p-6">
        <h3>Không tìm thấy warehouseId trong route.</h3>
        <Button onClick={() => router.push("/inventory")}>Quay lại</Button>
      </div>
    );
  }

  const details: BalanceItem[] = balanceData.details || [];
  const filteredDetails = applyFilter<BalanceItem>(details);

  // Hiển thị lỗi nếu có
  if (queryError) {
    return (
      <div className="p-6">
        <h3 className="text-red-600">
          Lỗi:{" "}
          {queryError instanceof Error ? queryError.message : "Unknown error"}
        </h3>
        <Button onClick={() => router.push("/inventory/balance")}>
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <WrapperContent<BalanceItem>
      isRefetching={isFetching}
      isLoading={isLoading}
      header={{
        refetchDataWithKeys: ["inventory", "balance", warehouseId],
        searchInput: {
          placeholder: "Tìm kiếm kho",
          filterKeys: ["itemName", "itemCode"],
        },
        filters: {
          fields: [],
          onApplyFilter: (arr) => updateQueries(arr),
          onReset: () => reset(),
          query,
        },
        columnSettings: {
          columns: columnsCheck,
          onChange: (c) => updateColumns(c),
          onReset: () => resetColumns(),
        },
        buttonEnds: [
          {
            type: "default",
            name: "Xuất Excel",
            onClick: handleExportExcel,
            icon: <DownloadOutlined />,
          },
          {
            type: "default",
            name: "Nhập Excel",
            onClick: handleImportExcel,
            icon: <UploadOutlined />,
          },
        ],
      }}
    >
      <CommonTable
        loading={isLoading}
        columns={getVisibleColumns()}
        dataSource={filteredDetails}
        paging
        rank
      />
    </WrapperContent>
  );
}
