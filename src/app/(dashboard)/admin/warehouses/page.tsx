"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WarehouseForm from "@/components/WarehouseForm";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useBranches } from "@/hooks/useBranchTrpc";
import { useCreateWarehouse, useDeleteWarehouse, useUpdateWarehouse, useWarehouses } from "@/hooks/useWarehouseTrpc";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { WarehouseType } from "@/types/enum";
import {
  Warehouse,
  WarehouseFormValues,
  WarehouseOptions,
} from "@/types/warehouse";
import {
  DownloadOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { App, Descriptions, Drawer, Modal, Tag } from "antd";
import { useState } from "react";

export default function WarehousesPage() {
  const { can } = usePermissions();
  const { data: branches = [] } = useBranches();
  const {
    reset,
    applyFilter,
    updateQueries,
    query,
    pagination,
    handlePageChange,
  } = useFilter();

  const { data: warehouses = [], isLoading, isFetching } = useWarehouses();

  const createMutation = useCreateWarehouse();
  const updateMutation = useUpdateWarehouse();
  const deleteMutation = useDeleteWarehouse();

  const warehousesData = warehouses.map(warehouse => ({
    ...warehouse,
    branchId: warehouse.branchId || 0,
    address: warehouse.address || undefined,
    isActive: warehouse.isActive ?? true,
    warehouseType: warehouse.warehouseType as WarehouseType,
    branchName: warehouse.branchName || "",
  }));

  const filtered = applyFilter<Warehouse>(warehousesData);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Warehouse | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const { modal } = App.useApp();
  const handleView = (row: Warehouse) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelected(null);
    setModalOpen(true);
  };

  const handleEdit = (row: Warehouse) => {
    setModalMode("edit");
    setSelected(row);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa kho này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate({ id }),
    });
  };

  const handleSubmit = (values: WarehouseFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate({
        warehouseCode: values.warehouseCode,
        warehouseName: values.warehouseName,
        branchId: typeof values.branchId === 'string' ? parseInt(values.branchId) : values.branchId,
        warehouseType: values.warehouseType,
        address: values.address,
      }, { onSuccess: () => setModalOpen(false) });
    } else if (selected) {
      updateMutation.mutate({
        id: selected.id,
        warehouseName: values.warehouseName,
        branchId: typeof values.branchId === 'string' ? parseInt(values.branchId) : values.branchId,
        warehouseType: values.warehouseType,
        isActive: values.isActive ?? true,
        address: values.address,
      }, { onSuccess: () => setModalOpen(false) });
    }
  };

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
      width: 220,
    },
    {
      title: "Loại",
      dataIndex: "warehouseType",
      key: "warehouseType",
      width: 160,
      render: (val: Warehouse["warehouseType"]) => (
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
    },
    { title: "Địa chỉ", dataIndex: "address", key: "address" },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (v: boolean) => (
        <Tag color={v ? "success" : "error"}>{v ? "Hoạt động" : "Khóa"}</Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_value: unknown, record: Warehouse) => {
        return (
          <TableActions
            onView={() => handleView(record)}
            onEdit={() => handleEdit(record)}
            onDelete={() => handleDelete(record.id)}
            canEdit={can("admin.warehouses", "edit")}
            canDelete={can("admin.warehouses", "delete")}
          />
        );
      },
    },
  ];

  const { exportToXlsx } = useFileExport<Warehouse>(columnsAll);

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  return (
    <>
      <WrapperContent<Warehouse>
        isNotAccessible={!can("admin.warehouses", "view")}
        isRefetching={isFetching}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["warehouses"],
          buttonEnds: [
            {
              can: can("admin.warehouses", "create"),
              type: "primary",
              name: "Thêm",
              onClick: handleCreate,
              icon: <PlusOutlined />,
            },
            {
              can: can("admin.warehouses", "create"),

              type: "default",
              name: "Xuất Excel",
              onClick: () => {
                exportToXlsx(
                  filtered,
                  `kho_hang_${new Date().toISOString()}.xlsx`
                );
              },
              icon: <DownloadOutlined />,
            },
            {
              can: can("admin.warehouses", "create"),

              type: "default",
              name: "Nhập Excel",
              onClick: () => {},
              icon: <UploadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm kiếm kho",
            filterKeys: [
              "warehouseName",
              "warehouseCode",
              "branchName",
              "address",
              "warehouseType",
            ],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "isActive",
                label: "Trạng thái",
                options: [
                  { label: "Hoạt động", value: true },
                  { label: "Khóa", value: false },
                ],
              },
              {
                type: "select",
                name: "warehouseType",
                label: "Loại kho",
                options: WarehouseOptions,
              },
              {
                type: "select",
                name: "branchId",
                label: "Chi nhánh",
                options: branches.map((b) => ({
                  label: b.branchName,
                  value: b.id,
                })),
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

      <Drawer
        size={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Chi tiết kho"
      >
        {selected ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Mã kho">
              {selected.warehouseCode}
            </Descriptions.Item>
            <Descriptions.Item label="Tên kho">
              {selected.warehouseName}
            </Descriptions.Item>
            <Descriptions.Item label="Chi nhánh">
              {selected.branchName}
            </Descriptions.Item>
            <Descriptions.Item label="Loại kho">
              {selected.warehouseType}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">
              {selected.address || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {selected.isActive ? "Hoạt động" : "Khóa"}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>

      <Modal
        title={modalMode === "create" ? "Tạo kho" : "Sửa kho"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        key={selected?.id || "create"}
        destroyOnHidden
      >
        <WarehouseForm
          initialValues={
            selected
              ? {
                  warehouseCode: selected.warehouseCode,
                  warehouseName: selected.warehouseName,
                  branchId: selected.branchId,
                  address: selected.address,
                  warehouseType: selected.warehouseType,
                  isActive: selected.isActive,
                }
              : {
                  warehouseType: WarehouseType.THANH_PHAM,
                  isActive: true,
                }
          }
          branches={branches}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </>
  );
}
