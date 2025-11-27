"use client";

import CommonTable from "@/components/CommonTable";
import PartnerDebtSidePanel from "@/components/PartnerDebtSidePanel";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Tabs,
  type TableColumnsType,
} from "antd";
import { useState } from "react";

interface Debt {
  id: number;
  debtCode: string;
  debtType: "RECEIVABLE" | "PAYABLE";
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
  customerName?: string;
  customerCode?: string;
  customerPhone?: string;
  supplierName?: string;
  supplierCode?: string;
  supplierPhone?: string;
  referenceType?: string;
  referenceId?: number;
  notes: string;
  createdAt: string;
}

interface DebtPayment {
  id: number;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  bankAccountNumber?: string;
  bankName?: string;
  createdByName: string;
  notes: string;
  createdAt: string;
}

interface CustomerSummary {
  id: number;
  customerCode: string;
  customerName: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  unpaidOrders: number;
}

interface SupplierSummary {
  id: number;
  supplierCode: string;
  supplierName: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  unpaidOrders: number;
}

interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  phone: string;
  debtAmount: number;
}

interface Supplier {
  id: number;
  supplierCode: string;
  supplierName: string;
  phone: string;
  debtAmount: number;
}

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
  balance: number;
}

type DebtFormValues = {
  debtCode: string;
  debtType: "RECEIVABLE" | "PAYABLE";
  customerId?: number | null;
  supplierId?: number | null;
  originalAmount: number | string;
  dueDate?: string;
  notes?: string;
};

export default function DebtsPage() {
  const { message } = App.useApp();
  const { can } = usePermissions();
  const [selectedPartner, setSelectedPartner] = useState<{
    id: number;
    name: string;
    code: string;
    type: "customer" | "supplier";
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    totalOrders: number;
    unpaidOrders: number;
  } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"customers" | "suppliers">(
    "customers"
  );

  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const customersQuery = useQuery({
    queryKey: ["sales", "customers"],
    queryFn: async () => {
      const res = await fetch("/api/sales/customers");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data.data as Customer[];
    },
  });

  const suppliersQuery = useQuery({
    queryKey: ["purchasing", "suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/purchasing/suppliers");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data.data as Supplier[];
    },
  });

  const bankAccountsQuery = useQuery({
    queryKey: ["finance", "bank-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/finance/bank-accounts?isActive=true");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data.data as BankAccount[];
    },
  });

  const customerSummariesQuery = useQuery({
    queryKey: ["finance", "debts", "summary", "customers"],
    queryFn: async () => {
      const res = await fetch("/api/finance/debts/summary?type=customers");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data.data as CustomerSummary[];
    },
  });

  const supplierSummariesQuery = useQuery({
    queryKey: ["finance", "debts", "summary", "suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/finance/debts/summary?type=suppliers");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data.data as SupplierSummary[];
    },
  });

  // derive local values from queries
  const customers = customersQuery.data ?? [];
  const suppliers = suppliersQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];
  const customerSummaries = customerSummariesQuery.data ?? [];
  const supplierSummaries = supplierSummariesQuery.data ?? [];

  const isLoading =
    customersQuery.isLoading ||
    suppliersQuery.isLoading ||
    bankAccountsQuery.isLoading ||
    customerSummariesQuery.isLoading ||
    supplierSummariesQuery.isLoading;

  const isFetching =
    customersQuery.isFetching ||
    suppliersQuery.isFetching ||
    bankAccountsQuery.isFetching ||
    customerSummariesQuery.isFetching ||
    supplierSummariesQuery.isFetching;

  const saveMutation = useMutation({
    mutationFn: async (values: DebtFormValues) => {
      const payload = {
        ...values,
        originalAmount: parseFloat(String(values.originalAmount || 0)),
      };
      const res = await fetch("/api/finance/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Tạo công nợ thành công!");
      setShowModal(false);
      resetForm();
      try {
        queryClient.invalidateQueries({ queryKey: ["finance", "debts"] });
        queryClient.invalidateQueries({ queryKey: ["sales", "customers"] });
        queryClient.invalidateQueries({
          queryKey: ["purchasing", "suppliers"],
        });
        queryClient.invalidateQueries({
          queryKey: ["finance", "bank-accounts"],
        });
        queryClient.invalidateQueries({
          queryKey: ["finance", "debts", "summary"],
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

  // old fetch helpers removed; data is loaded via react-query above

  const handleViewPartnerDetails = (
    partner: CustomerSummary | SupplierSummary,
    type: "customer" | "supplier"
  ) => {
    const name =
      type === "customer"
        ? (partner as CustomerSummary).customerName
        : (partner as SupplierSummary).supplierName;
    const code =
      type === "customer"
        ? (partner as CustomerSummary).customerCode
        : (partner as SupplierSummary).supplierCode;

    setSelectedPartner({
      id: partner.id,
      name,
      code,
      type,
      totalAmount: parseFloat(partner.totalAmount.toString()),
      paidAmount: parseFloat(partner.paidAmount.toString()),
      remainingAmount: parseFloat(partner.remainingAmount.toString()),
      totalOrders: partner.totalOrders,
      unpaidOrders: partner.unpaidOrders,
    });
    setShowSidePanel(true);
  };
  const debtType = Form.useWatch("debtType", form) || "RECEIVABLE";

  const onFinish = (values: DebtFormValues) => {
    saveMutation.mutate(values);
  };

  const resetForm = () => {
    form.resetFields();
  };

  const {
    reset,
    applyFilter,
    updateQueries,
    query,
    pagination,
    handlePageChange,
  } = useFilter();

  const handleResetAll = () => {
    setActiveTab("customers");
    reset();
  };

  const filteredCustomerSummaries = applyFilter(
    customerSummaries as CustomerSummary[]
  );
  const filteredSupplierSummaries = applyFilter(
    supplierSummaries as SupplierSummary[]
  );

  const totalReceivable = filteredCustomerSummaries.reduce(
    (sum, c) => sum + parseFloat(c.remainingAmount?.toString() || "0"),
    0
  );
  const totalPayable = filteredSupplierSummaries.reduce(
    (sum, s) => sum + parseFloat(s.remainingAmount?.toString() || "0"),
    0
  );

  const customerColumns: TableColumnsType<CustomerSummary> = [
    {
      title: "Mã KH",
      dataIndex: "customerCode",
      key: "customerCode",
      width: 140,
    },
    { title: "Khách hàng", dataIndex: "customerName", key: "customerName" },
    { title: "Liên hệ", dataIndex: "phone", key: "phone", width: 160 },
    {
      title: "Số ĐH",
      dataIndex: "totalOrders",
      key: "totalOrders",
      width: 100,
      align: "center",
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 140,
      align: "right",
      render: (v: number) =>
        parseFloat(String(v)).toLocaleString("vi-VN") + " đ",
    },
    {
      title: "Đã trả",
      dataIndex: "paidAmount",
      key: "paidAmount",
      width: 140,
      align: "right",
      render: (v: number) =>
        parseFloat(String(v)).toLocaleString("vi-VN") + " đ",
    },
    {
      title: "Còn nợ",
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      width: 140,
      align: "right",
      render: (v: number) =>
        parseFloat(String(v)).toLocaleString("vi-VN") + " đ",
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      align: "right",
      render: (_: unknown, record: CustomerSummary) => (
        <button
          onClick={() => handleViewPartnerDetails(record, "customer")}
          className="text-blue-600 hover:text-blue-900"
        >
          Chi tiết
        </button>
      ),
    },
  ];

  const supplierColumns: TableColumnsType<SupplierSummary> = [
    {
      title: "Mã NCC",
      dataIndex: "supplierCode",
      key: "supplierCode",
      width: 140,
    },
    { title: "Nhà cung cấp", dataIndex: "supplierName", key: "supplierName" },
    { title: "Liên hệ", dataIndex: "phone", key: "phone", width: 160 },
    {
      title: "Số ĐM",
      dataIndex: "totalOrders",
      key: "totalOrders",
      width: 100,
      align: "center",
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 140,
      align: "right",
      render: (v: number) =>
        parseFloat(String(v)).toLocaleString("vi-VN") + " đ",
    },
    {
      title: "Đã trả",
      dataIndex: "paidAmount",
      key: "paidAmount",
      width: 140,
      align: "right",
      render: (v: number) =>
        parseFloat(String(v)).toLocaleString("vi-VN") + " đ",
    },
    {
      title: "Còn nợ",
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      width: 140,
      align: "right",
      render: (v: number) =>
        parseFloat(String(v)).toLocaleString("vi-VN") + " đ",
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      align: "right",
      render: (_: unknown, record: SupplierSummary) => (
        <button
          onClick={() => handleViewPartnerDetails(record, "supplier")}
          className="text-blue-600 hover:text-blue-900"
        >
          Chi tiết
        </button>
      ),
    },
  ];
  const { exportToXlsx: exportCustomers } =
    useFileExport<CustomerSummary>(customerColumns);

  const { exportToXlsx: exportSuppliers } =
    useFileExport<SupplierSummary>(supplierColumns);

  const handleExportExcel = () => {
    if (activeTab === "customers") {
      exportCustomers(
        filteredCustomerSummaries as CustomerSummary[],
        `cong_no_khach_hang_${new Date().toISOString()}.xlsx`
      );
    } else {
      exportSuppliers(
        filteredSupplierSummaries as SupplierSummary[],
        `cong_no_nha_cung_cap_${new Date().toISOString()}.xlsx`
      );
    }
  };

  const handleImportExcel = () => {
    message.info("Chức năng nhập Excel đang được phát triển");
  };

  const {
    columnsCheck: custColumnsCheck,
    updateColumns: updateCustColumns,
    resetColumns: resetCustColumns,
    getVisibleColumns: getVisibleCustomerColumns,
  } = useColumn({ defaultColumns: customerColumns });
  const {
    columnsCheck: suppColumnsCheck,
    updateColumns: updateSuppColumns,
    resetColumns: resetSuppColumns,
    getVisibleColumns: getVisibleSupplierColumns,
  } = useColumn({ defaultColumns: supplierColumns });

  return (
    <>
      <WrapperContent
        title="Quản lý công nợ"
        isNotAccessible={!can("finance.debts", "view")}
        isRefetching={isFetching}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: [
            "finance",
            "debts",
            "orders",
            "customers",
            "suppliers",
            "bank-accounts",
          ],
          buttonEnds: can("finance.debts", "create")
            ? [
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
            placeholder:
              activeTab === "customers"
                ? "Tìm theo mã KH, tên, SĐT..."
                : "Tìm theo mã NCC, tên, SĐT...",
            filterKeys:
              activeTab === "customers"
                ? ["customerCode", "customerName", "phone"]
                : ["supplierCode", "supplierName", "phone"],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "hasDebt",
                label: "Công nợ",
                options: [
                  { label: "Có công nợ", value: "true" },
                  { label: "Đã thanh toán", value: "false" },
                ],
              },
            ],
            onApplyFilter: (arr) => updateQueries(arr),
            onReset: () => reset(),
            query,
          },
          columnSettings:
            activeTab === "customers"
              ? {
                  columns: custColumnsCheck,
                  onChange: (c) => updateCustColumns(c),
                  onReset: () => resetCustColumns(),
                }
              : {
                  columns: suppColumnsCheck,
                  onChange: (c) => updateSuppColumns(c),
                  onReset: () => resetSuppColumns(),
                },
        }}
      >
        <div className="flex">
          {/* Main Content */}
          <div
            className={`flex-1 transition-all duration-300 ${
              showSidePanel ? "mr-[600px]" : ""
            }`}
          >
            <div className="space-y-6">
              {/* Summary */}
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Card>
                    <Statistic
                      title="Tổng phải thu (Khách hàng)"
                      value={totalReceivable.toLocaleString("vi-VN")}
                      suffix=" đ"
                    />
                    <div className="text-xs text-green-600 mt-1">
                      {filteredCustomerSummaries.length} khách hàng
                    </div>
                  </Card>
                </Col>

                <Col xs={24} sm={12}>
                  <Card>
                    <Statistic
                      title="Tổng phải trả (Nhà cung cấp)"
                      value={totalPayable.toLocaleString("vi-VN")}
                      suffix=" đ"
                    />
                    <div className="text-xs text-red-600 mt-1">
                      {filteredSupplierSummaries.length} nhà cung cấp
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* Tabs */}
              <Tabs
                activeKey={activeTab}
                onChange={(key) =>
                  setActiveTab(key as "customers" | "suppliers")
                }
                items={[
                  {
                    key: "customers",
                    label: `Khách hàng (${filteredCustomerSummaries.length})`,
                  },
                  {
                    key: "suppliers",
                    label: `Nhà cung cấp (${filteredSupplierSummaries.length})`,
                  },
                ]}
              />

              {/* Customer Summary Table */}
              {activeTab === "customers" && (
                <CommonTable
                  pagination={{
                    ...pagination,
                    onChange: handlePageChange,
                  }}
                  columns={getVisibleCustomerColumns()}
                  dataSource={filteredCustomerSummaries}
                  loading={isLoading || isFetching}
                  paging
                />
              )}

              {/* Supplier Summary Table */}
              {activeTab === "suppliers" && (
                <CommonTable
                  pagination={{
                    ...pagination,
                    onChange: handlePageChange,
                  }}
                  columns={getVisibleSupplierColumns()}
                  dataSource={filteredSupplierSummaries}
                  loading={isLoading || isFetching}
                  paging
                />
              )}
            </div>
          </div>

          {/* Side Panel - Partner Debt */}
          {showSidePanel && selectedPartner && (
            <PartnerDebtSidePanel
              partnerId={selectedPartner.id}
              partnerName={selectedPartner.name}
              partnerCode={selectedPartner.code}
              partnerType={selectedPartner.type}
              totalAmount={selectedPartner.totalAmount}
              paidAmount={selectedPartner.paidAmount}
              remainingAmount={selectedPartner.remainingAmount}
              totalOrders={selectedPartner.totalOrders}
              unpaidOrders={selectedPartner.unpaidOrders}
              bankAccounts={bankAccounts}
              canEdit={can("finance.debts", "edit")}
              onClose={() => {
                setShowSidePanel(false);
                setSelectedPartner(null);
              }}
              onPaymentSuccess={() => {
                setShowSidePanel(false);
                setSelectedPartner(null);
                try {
                  queryClient.invalidateQueries({
                    queryKey: ["finance", "debts", "summary"],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["sales", "customers"],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["purchasing", "suppliers"],
                  });
                } catch {
                  // ignore
                }
              }}
            />
          )}

          {/* Create Debt Modal */}
          <Modal
            open={showModal}
            onCancel={() => {
              setShowModal(false);
              resetForm();
            }}
            title="Thêm công nợ"
            onOk={() => form.submit()}
            confirmLoading={saveMutation.isPending}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ debtType: "RECEIVABLE" }}
            >
              <Form.Item
                name="debtCode"
                label="Mã công nợ"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="debtType"
                label="Loại công nợ"
                rules={[{ required: true }]}
              >
                <Select
                  onChange={() =>
                    form.setFieldsValue({
                      customerId: undefined,
                      supplierId: undefined,
                    })
                  }
                >
                  <Select.Option value="RECEIVABLE">
                    Phải thu (Khách hàng)
                  </Select.Option>
                  <Select.Option value="PAYABLE">
                    Phải trả (Nhà cung cấp)
                  </Select.Option>
                </Select>
              </Form.Item>

              {debtType === "RECEIVABLE" && (
                <Form.Item
                  name="customerId"
                  label="Khách hàng"
                  rules={[{ required: true }]}
                >
                  <Select placeholder="-- Chọn khách hàng --">
                    {customers.map((c) => (
                      <Select.Option key={c.id} value={c.id}>
                        {c.customerName} ({c.customerCode})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              {debtType === "PAYABLE" && (
                <Form.Item
                  name="supplierId"
                  label="Nhà cung cấp"
                  rules={[{ required: true }]}
                >
                  <Select placeholder="-- Chọn nhà cung cấp --">
                    {suppliers.map((s) => (
                      <Select.Option key={s.id} value={s.id}>
                        {s.supplierName} ({s.supplierCode})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              <Form.Item
                name="originalAmount"
                label="Số tiền"
                rules={[{ required: true }]}
              >
                <InputNumber style={{ width: "100%" }} min={0} step={0.01} />
              </Form.Item>

              <Form.Item name="dueDate" label="Hạn thanh toán">
                <Input type="date" />
              </Form.Item>

              <Form.Item name="notes" label="Ghi chú">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Form>
          </Modal>
        </div>
      </WrapperContent>
    </>
  );
}
