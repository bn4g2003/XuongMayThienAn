"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import useColumn from "@/hooks/useColumn";
import {
  DownloadOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Tag, type TableColumnsType } from "antd";
import Link from "next/link";

type Warehouse = {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: "NVL" | "THANH_PHAM";
  branchId: number;
  branchName?: string;
  isActive?: boolean;
};

export default function InventoryHub({ path }: { path: string }) {
  const { can } = usePermissions();
  const {
    reset,
    applyFilter,
    updateQueries,
    query,
    pagination,
    handlePageChange,
  } = useFilter();
  const queryClient = useQueryClient();

  const {
    data: warehousesData = [],
    isLoading,
    isFetching,
  } = useQuery<Warehouse[]>({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/warehouses");
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  const warehouseOptions = (warehousesData || []).map((w) => ({
    label: w.warehouseName,
    value: w.id,
  }));
  const branchMap = new Map<number, string>();
  (warehousesData || []).forEach((w) =>
    branchMap.set(w.branchId, w.branchName || "")
  );
  const branchOptions = Array.from(branchMap.entries()).map(([id, name]) => ({
    label: name,
    value: id,
  }));

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/warehouses/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["warehouses"] }),
  });

  const filtered = applyFilter<Warehouse>(warehousesData || []);

  const columnsAll: TableColumnsType<Warehouse> = [
    {
      title: "Mã",
      dataIndex: "warehouseCode",
      key: "warehouseCode",
      width: 140,
    },
    {
      title: "Tên",
      dataIndex: "warehouseName",
      key: "warehouseName",
      width: 240,
    },
    {
      title: "Loại",
      dataIndex: "warehouseType",
      key: "warehouseType",
      width: 120,
      render: (val: string) => (
        <Tag color={val === "NVL" ? "purple" : "green"}>
          {val === "NVL" ? "NVL" : "TP"}
        </Tag>
      ),
    },
    {
      title: "Chi nhánh",
      dataIndex: "branchName",
      key: "branchName",
      width: 180,
      render: (val: string | undefined) => val || "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_value: unknown, record: Warehouse) => (
        <Link href={`/inventory/${path}/${record.id}`}>Quản lý</Link>
      ),
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  const handleExportExcel = () => {
    // TODO: Implement export to Excel functionality
    console.log("Xuất Excel");
  };

  const handleImportExcel = () => {
    // TODO: Implement import from Excel functionality
    console.log("Nhập Excel");
  };

  return (
    <>
      <WrapperContent<Warehouse>
        isNotAccessible={!can("inventory.balance", "view")}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["warehouses"],
          buttonEnds: [
            {
              can: can(`inventory.${path}`, "create"),
              type: "primary",
              name: "Thêm phiếu",
              onClick: () => {},
              icon: <PlusOutlined />,
            },
            {
              can: can(`inventory.${path}`, "view"),
              type: "default",
              name: "Xuất Excel",
              onClick: handleExportExcel,
              icon: <DownloadOutlined />,
            },
            {
              can: can(`inventory.${path}`, "view"),
              type: "default",
              name: "Nhập Excel",
              onClick: handleImportExcel,
              icon: <UploadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm kiếm kho",
            filterKeys: [
              "warehouseName",
              "warehouseCode",
              "branchName",
              "warehouseType",
            ],
          },
          filters: {
            fields: [
              { name: "date", label: "Ngày phiếu", type: "date" },
              { name: "createdAt", label: "Từ - đến", type: "dateRange" },
              {
                name: "warehouseId",
                label: "Kho",
                type: "select",
                options: warehouseOptions,
              },
              {
                name: "branchId",
                label: "Chi nhánh",
                type: "select",
                options: branchOptions,
              },
            ],
            onApplyFilter: (arr) => updateQueries(arr),
            onReset: () => reset(),
            query,
          },
          columnSettings: {
            columns: columnsCheck,
            onChange: (c) => updateColumns(c),
            onReset: () => resetColumns(),
          },
        }}
      >
        <CommonTable
          pagination={{
            ...pagination,
            onChange: handlePageChange,
          }}
          columns={getVisibleColumns()}
          dataSource={filtered}
          loading={isLoading || isFetching || deleteMutation.isPending}
          paging
          rank
        />
      </WrapperContent>
    </>
  );
}
