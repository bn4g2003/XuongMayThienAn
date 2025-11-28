"use client";

import CashbookSidePanel from "@/components/CashbookSidePanel";
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
  Select,
  Statistic,
  Tag,
} from "antd";
import { useEffect, useState } from "react";

interface CashBook {
  id: number;
  transactionCode: string;
  transactionDate: string;
  amount: number;
  transactionType: "THU" | "CHI";
  paymentMethod: "CASH" | "BANK" | "TRANSFER";
  description: string;
  categoryName: string;
  categoryCode: string;
  categoryId: number;
  bankAccountNumber?: string;
  bankName?: string;
  bankAccountId?: number;
  createdByName: string;
  branchName: string;
  createdAt: string;
}

interface FinancialCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  type: "THU" | "CHI";
}

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
  balance: number;
}

type CashbookFormValues = {
  transactionCode: string;
  transactionDate: string;
  financialCategoryId: string | number;
  amount: number | string;
  transactionType: "THU" | "CHI";
  paymentMethod: "CASH" | "BANK" | "TRANSFER";
  bankAccountId?: string | number | null;
  description?: string;
};

export default function CashBooksPage() {
  const { can } = usePermissions();
  const { message } = App.useApp();
  const [cashbooks, setCashbooks] = useState<CashBook[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCashbook, setSelectedCashbook] = useState<CashBook | null>(
    null
  );
  const {
    reset,
    applyFilter,
    updateQueries,
    query,
    pagination,
    handlePageChange,
  } = useFilter();

  const [form] = Form.useForm();

  useEffect(() => {
    fetchCashbooks();
    fetchCategories();
    fetchBankAccounts();
  }, []);

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (values: CashbookFormValues) => {
      const payload = {
        ...values,
        amount: parseFloat(String(values.amount || 0)),
        financialCategoryId: parseInt(String(values.financialCategoryId)),
        bankAccountId: values.bankAccountId
          ? parseInt(String(values.bankAccountId))
          : null,
      };
      const res = await fetch("/api/finance/cashbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Tạo phiếu thu/chi thành công!");
      setShowModal(false);
      resetForm();
      fetchCashbooks();
      fetchBankAccounts();
      try {
        queryClient.invalidateQueries({ queryKey: ["finance", "cashbooks"] });
        queryClient.invalidateQueries({
          queryKey: ["finance", "bank-accounts"],
        });
      } catch {
        // ignore
      }
    },
    onError: (err: unknown) => {
      const error = err as Error;
      message.error(error.message || "Có lỗi xảy ra");
    },
  });

  const fetchCashbooks = async () => {
    try {
      const res = await fetch("/api/finance/cashbooks");
      const data = await res.json();
      if (data.success) {
        setCashbooks(data.data);
      }
    } catch (error) {
      console.error("Error fetching cashbooks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/finance/categories?isActive=true");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch("/api/finance/bank-accounts?isActive=true");
      const data = await res.json();
      if (data.success) {
        setBankAccounts(data.data);
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    }
  };

  const onFinish = (values: CashbookFormValues) => {
    saveMutation.mutate(values);
  };

  const resetForm = () => {
    form.resetFields();
  };

  const handleResetAll = () => {
    reset();
  };

  const handleExportExcel = () => {
    exportToXlsx(
      filteredCashbooks as CashBook[],
      `so_quy_${new Date().toISOString()}.xlsx`
    );
  };

  const handleImportExcel = () => {
    message.info("Chức năng nhập Excel đang được phát triển");
  };

  const filteredCashbooks = applyFilter(cashbooks as CashBook[]);

  const totalThu = filteredCashbooks
    .filter((cb) => cb.transactionType === "THU")
    .reduce((sum, cb) => sum + parseFloat(cb.amount.toString()), 0);

  const totalChi = filteredCashbooks
    .filter((cb) => cb.transactionType === "CHI")
    .reduce((sum, cb) => sum + parseFloat(cb.amount.toString()), 0);

  const transactionType = Form.useWatch("transactionType", form) || "THU";
  const paymentMethod = Form.useWatch("paymentMethod", form) || "CASH";
  const filteredCategories = categories.filter(
    (cat) => cat.type === transactionType
  );

  const columnsAll: TableColumnsType<CashBook> = [
    {
      title: "Mã",
      dataIndex: "transactionCode",
      key: "transactionCode",
      width: 160,
      render: (text, record) => (
        <a onClick={() => setSelectedCashbook(record as CashBook)}>{text}</a>
      ),
    },
    {
      title: "Ngày",
      dataIndex: "transactionDate",
      key: "transactionDate",
      width: 140,
      render: (d: string) => new Date(d).toLocaleDateString("vi-VN"),
    },
    {
      title: "Danh mục",
      dataIndex: "categoryName",
      key: "categoryName",
      width: 200,
    },
    {
      title: "Loại",
      dataIndex: "transactionType",
      key: "transactionType",
      width: 100,
      render: (t: "THU" | "CHI") => (
        <Tag color={t === "THU" ? "success" : "error"}>{t}</Tag>
      ),
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      width: 140,
      align: "right",
      render: (a: number) =>
        parseFloat(String(a)).toLocaleString("vi-VN") + " đ",
    },
    {
      title: "Phương thức",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 160,
      render: (p) =>
        p === "CASH" ? "Tiền mặt" : p === "BANK" ? "Ngân hàng" : "Chuyển khoản",
    },
    { title: "Mô tả", dataIndex: "description", key: "description" },
  ];
  const { exportToXlsx } = useFileExport<CashBook>(columnsAll);

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  return (
    <>
      <WrapperContent<CashBook>
        isNotAccessible={!can("finance.cashbooks", "view")}
        isLoading={loading}
        header={{
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
            : [
                {
                  type: "default",
                  name: "Đặt lại",
                  onClick: handleResetAll,
                  icon: <ReloadOutlined />,
                },
              ],
          searchInput: {
            placeholder: "Tìm theo mã GD, danh mục, mô tả...",
            filterKeys: ["transactionCode", "categoryName", "description"],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "transactionType",
                label: "Loại",
                options: [
                  { label: "Thu", value: "THU" },
                  { label: "Chi", value: "CHI" },
                ],
              },
              {
                type: "select",
                name: "paymentMethod",
                label: "Phương thức",
                options: [
                  { label: "Tiền mặt", value: "CASH" },
                  { label: "Ngân hàng", value: "BANK" },
                  { label: "Chuyển khoản", value: "TRANSFER" },
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
        <div className="space-y-6">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8} md={6}>
              <Card>
                <Statistic
                  title="Tổng thu"
                  value={totalThu.toLocaleString("vi-VN") + " đ"}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Card>
                <Statistic
                  title="Tổng chi"
                  value={totalChi.toLocaleString("vi-VN") + " đ"}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Card>
                <Statistic
                  title="Chênh lệch"
                  value={(totalThu - totalChi).toLocaleString("vi-VN") + " đ"}
                />
              </Card>
            </Col>
          </Row>

          <CommonTable
            pagination={{ ...pagination, onChange: handlePageChange }}
            columns={getVisibleColumns()}
            dataSource={filteredCashbooks}
            loading={loading}
            paging
          />
        </div>
      </WrapperContent>

      {/* Modal */}
      <Modal
        open={showModal}
        onCancel={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Thêm phiếu thu/chi"
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            transactionDate: new Date().toISOString().split("T")[0],
            transactionType: "THU",
            paymentMethod: "CASH",
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="transactionCode"
                label="Mã giao dịch"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="transactionDate"
                label="Ngày giao dịch"
                rules={[{ required: true }]}
              >
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="transactionType"
            label="Loại"
            rules={[{ required: true }]}
          >
            <Select
              onChange={() =>
                form.setFieldsValue({ financialCategoryId: undefined })
              }
            >
              <Select.Option value="THU">Thu</Select.Option>
              <Select.Option value="CHI">Chi</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="financialCategoryId"
            label="Danh mục"
            rules={[{ required: true }]}
          >
            <Select placeholder="-- Chọn danh mục --">
              {filteredCategories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.categoryName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="amount" label="Số tiền" rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} min={0} step={0.01} />
          </Form.Item>

          <Form.Item
            name="paymentMethod"
            label="Phương thức"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="CASH">Tiền mặt</Select.Option>
              <Select.Option value="BANK">Ngân hàng</Select.Option>
              <Select.Option value="TRANSFER">Chuyển khoản</Select.Option>
            </Select>
          </Form.Item>

          {(paymentMethod === "BANK" || paymentMethod === "TRANSFER") && (
            <Form.Item
              name="bankAccountId"
              label="Tài khoản ngân hàng"
              rules={[{ required: true }]}
            >
              <Select placeholder="-- Chọn tài khoản --">
                {bankAccounts.map((acc) => (
                  <Select.Option key={acc.id} value={acc.id}>
                    {acc.bankName} - {acc.accountNumber} (Số dư:{" "}
                    {acc.balance.toLocaleString("vi-VN")} đ)
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Side Panel */}
      {selectedCashbook && (
        <CashbookSidePanel
          cashbook={selectedCashbook}
          onClose={() => setSelectedCashbook(null)}
        />
      )}
    </>
  );
}
