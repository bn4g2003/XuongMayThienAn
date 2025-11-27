"use client";

import BranchDetailDrawer from "@/components/branches/BranchDetailDrawer";
import BranchFormModal, {
  type BranchFormValues,
} from "@/components/branches/BranchFormModal";
import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { BRANCH_KEYS, useBranches, useCreateBranch, useDeleteBranch, useUpdateBranch } from "@/hooks/useBranchTrpc";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import type { Branch } from "@/services/commonService";
import {
  DownloadOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { App, Tag } from "antd";
import { useState } from "react";

export default function BranchesPage() {
  const { can } = usePermissions();
  const {
    reset,
    applyFilter,
    updateQueries,
    query,
    pagination,
    handlePageChange,
  } = useFilter();

  const { data: branches = [], isLoading, isFetching } = useBranches();

  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();
  const deleteMutation = useDeleteBranch();

  const branchesData = branches.map(branch => ({
    ...branch,
    address: branch.address || undefined,
    phone: branch.phone || undefined,
    email: branch.email || undefined,
    isActive: branch.isActive ?? true,
    createdAt: branch.createdAt?.toISOString() || undefined,
  }));

  const filtered = applyFilter(branchesData as Branch[]);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const { modal } = App.useApp();

  const handleView = (b: Branch) => {
    setSelectedBranch(b);
    setDrawerVisible(true);
  };
  const handleCreate = () => {
    setModalMode("create");
    setSelectedBranch(null);
    setModalVisible(true);
  };
  const handleEdit = (b: Branch) => {
    setModalMode("edit");
    setSelectedBranch(b);
    setModalVisible(true);
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa chi nhánh này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate({ id }),
    });
  };

  const handleModalSubmit = (values: BranchFormValues) => {
    if (modalMode === "create") {
      if (!values.branchCode) {
        modal.error({ title: "Lỗi", content: "Mã chi nhánh là bắt buộc" });
        return;
      }
      createMutation.mutate({
        branchCode: values.branchCode,
        branchName: values.branchName,
        address: values.address,
        phone: values.phone,
        email: values.email,
      }, {
        onSuccess: () => setModalVisible(false),
      });
    } else if (selectedBranch) {
      updateMutation.mutate({
        id: selectedBranch.id,
        branchName: values.branchName,
        address: values.address,
        phone: values.phone,
        email: values.email,
        isActive: values.isActive ?? true,
      }, {
        onSuccess: () => setModalVisible(false),
      });
    }
  };

  const columnsAll: TableColumnsType<Branch> = [
    {
      title: "Mã",
      dataIndex: "branchCode",
      key: "branchCode",
      width: 160,
      fixed: "left",
    },
    {
      title: "Tên",
      dataIndex: "branchName",
      key: "branchName",
      width: 240,
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      key: "address",
      width: 240,
      render: (t) => t || "-",
    },
    { title: "Điện thoại", dataIndex: "phone", key: "phone", width: 160 },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (isActive: boolean) => (
        <Tag color={isActive ? "success" : "error"}>
          {isActive ? "Hoạt động" : "Khóa"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 180,
      fixed: "right",
      render: (_: unknown, record: Branch) => {
        return (
          <TableActions
            onView={() => handleView(record)}
            onEdit={() => handleEdit(record)}
            onDelete={() => handleDelete(record.id)}
            canEdit={can("admin.branches", "edit")}
            canDelete={can("admin.branches", "delete")}
          />
        );
      },
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  const { exportToXlsx } = useFileExport<Branch>(columnsAll);

  return (
    <>
      <WrapperContent<Branch>
        isNotAccessible={!can("admin.branches", "view")}
        isRefetching={isFetching}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: BRANCH_KEYS.all,
          buttonEnds: [
            {
              can: can("admin.branches", "create"),
              type: "primary",
              name: "Thêm",
              onClick: handleCreate,
              icon: <PlusOutlined />,
            },
            {
              can: can("admin.branches", "create"),

              type: "default",
              name: "Xuất Excel",
              onClick: () => {
                exportToXlsx(
                  filtered,
                  `chi-nhanh-${new Date().toISOString()}.xlsx`
                );
              },
              icon: <DownloadOutlined />,
            },
            {
              can: can("admin.branches", "create"),

              type: "default",
              name: "Nhập Excel",
              onClick: () => {},
              icon: <UploadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm kiếm chi nhánh",
            filterKeys: ["branchCode", "branchName", "address", "phone"],
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
                type: "date",
                name: "createdAt",
                label: "Ngày tạo",
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
          dataSource={filtered as Branch[]}
          loading={isLoading || deleteMutation.isPending || isFetching}
          paging
          rank
        />
      </WrapperContent>

      <BranchDetailDrawer
        open={drawerVisible}
        branch={selectedBranch}
        onClose={() => setDrawerVisible(false)}
        onEdit={(b) => {
          setDrawerVisible(false);
          handleEdit(b);
        }}
        onDelete={(id) => {
          setDrawerVisible(false);
          handleDelete(id);
        }}
        canEdit={can("admin.branches", "edit")}
        canDelete={can("admin.branches", "delete")}
      />

      <BranchFormModal
        open={modalVisible}
        mode={modalMode}
        branch={selectedBranch}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
      />
    </>
  );
}
