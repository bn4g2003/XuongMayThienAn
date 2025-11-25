"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  App,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Statistic,
  Tag,
} from "antd";
import { useEffect, useState } from "react";

interface BankAccount {
  id: number;
  accountNumber: string;
  accountHolder: string;
  bankName: string;
  branchName?: string;
  balance: number;
  isActive: boolean;
  companyBranchName: string;
  createdAt: string;
}

export default function BankAccountsPage() {
  const { can } = usePermissions();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { reset, applyFilter, updateQueries, query } = useFilter();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/finance/bank-accounts");
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data);
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  type BankAccountFormValues = {
    accountNumber: string;
    accountHolder: string;
    bankName: string;
    branchName?: string;
    balance?: number | string;
  };

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (values: BankAccountFormValues) => {
      const res = await fetch("/api/finance/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          balance: parseFloat(String(values.balance || "0")),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      message.success("Tạo tài khoản ngân hàng thành công!");
      setShowModal(false);
      resetForm();
      fetchAccounts();
    },
    onError: (err: unknown) => {
      const error = err as Error;
      message.error(error.message || "Có lỗi xảy ra");
    },
  });

  const onFinish = (values: BankAccountFormValues) => {
    createMutation.mutate(values);
  };

  const resetForm = () => {
    form.resetFields();
  };

  const handleResetAll = () => {
    reset();
  };

  const handleImportExcel = () => {
    message.info("Chức năng nhập Excel đang được phát triển");
  };

  const filteredAccounts = applyFilter(accounts as BankAccount[]);

  const totalBalance = filteredAccounts.reduce(
    (sum, acc) => sum + parseFloat(acc.balance.toString()),
    0
  );

  const columnsAll: TableColumnsType<BankAccount> = [
    {
      title: "Số TK",
      dataIndex: "accountNumber",
      key: "accountNumber",
      width: 160,
    },
    {
      title: "Chủ TK",
      dataIndex: "accountHolder",
      key: "accountHolder",
      width: 220,
    },
    { title: "Ngân hàng", dataIndex: "bankName", key: "bankName", width: 200 },
    {
      title: "Chi nhánh NH",
      dataIndex: "branchName",
      key: "branchName",
      width: 200,
      render: (t) => t || "-",
    },
    {
      title: "Số dư",
      dataIndex: "balance",
      key: "balance",
      width: 140,
      align: "right",
      render: (b: number) =>
        parseFloat(String(b)).toLocaleString("vi-VN") + " đ",
    },
    {
      title: "Chi nhánh",
      dataIndex: "companyBranchName",
      key: "companyBranchName",
      width: 200,
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (isActive: boolean) => (
        <Tag color={isActive ? "success" : "default"}>
          {isActive ? "Hoạt động" : "Ngừng"}
        </Tag>
      ),
    },
  ];
  const { exportToXlsx } = useFileExport<BankAccount>(columnsAll);
  const handleExportExcel = () => {
    exportToXlsx(
      accounts,
      `tai_khoan_ngan_hang_${new Date().toISOString()}.xlsx`
    );
  };

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  const [form] = Form.useForm();
  const { message } = App.useApp();

  return (
    <>
      <WrapperContent<BankAccount>
        isNotAccessible={!can("finance.cashbooks", "view")}
        isLoading={loading}
        header={{
          refetchDataWithKeys: ["bank-accounts"],
          buttonEnds: can("finance.cashbooks", "create")
            ? [
                {
                  type: "default",
                  name: "Đặt lại",
                  onClick: handleResetAll,
                  icon: <ReloadOutlined />,
                },
                {
                  type: "primary",
                  name: "Thêm",
                  onClick: () => {
                    resetForm();
                    setShowModal(true);
                  },
                  icon: <PlusOutlined />,
                },
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
              ]
            : undefined,
          searchInput: {
            placeholder: "Tìm theo số TK, chủ TK, ngân hàng...",
            filterKeys: ["accountNumber", "accountHolder", "bankName"],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "isActive",
                label: "Trạng thái",
                options: [
                  { label: "Hoạt động", value: "true" },
                  { label: "Ngừng", value: "false" },
                ],
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
        <Row gutter={[16, 16]} style={{ marginBottom: 12 }}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card>
              <Statistic
                title="Tổng số dư"
                value={totalBalance.toLocaleString("vi-VN") + " đ"}
              />
            </Card>
          </Col>
        </Row>

        <CommonTable
          columns={getVisibleColumns()}
          dataSource={filteredAccounts}
          loading={loading}
          paging
        />
      </WrapperContent>

      {/* Modal */}
      <Modal
        open={showModal}
        onCancel={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Thêm tài khoản ngân hàng"
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="space-y-4"
        >
          <Form.Item
            name="accountNumber"
            label="Số tài khoản"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="accountHolder"
            label="Chủ tài khoản"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="bankName"
            label="Ngân hàng"
            rules={[{ required: true }]}
          >
            <Input placeholder="VD: Vietcombank, Techcombank, BIDV..." />
          </Form.Item>

          <Form.Item name="branchName" label="Chi nhánh ngân hàng">
            <Input placeholder="VD: Chi nhánh Hà Nội" />
          </Form.Item>

          <Form.Item name="balance" label="Số dư ban đầu">
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: "100%" }}
              placeholder="0"
            />
          </Form.Item>

          {/* Modal footer buttons used (Modal.onOk / onCancel) */}
        </Form>
      </Modal>
    </>
  );
}
