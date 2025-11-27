"use client";

import {
  DollarOutlined,
  PayCircleOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Statistic,
} from "antd";
import { useState } from "react";

interface Order {
  id: number;
  orderCode: string;
  orderDate: string;
  totalAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: string;
  status: string;
  notes?: string;
  customerName?: string;
  supplierName?: string;
  branchName: string;
}

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
}

interface Props {
  orders: Order[];
  partnerName: string;
  partnerCode: string;
  orderType: "order" | "purchase_order";
  bankAccounts: BankAccount[];
  canEdit: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export default function OrderDebtSidePanel({
  orders,
  partnerName,
  partnerCode,
  orderType,
  bankAccounts,
  canEdit,
  onClose,
  onPaymentSuccess,
}: Props) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const handlePaymentSubmit = async (values: any) => {
    if (!selectedOrder) return;

    try {
      const res = await fetch(
        `/api/finance/debts/orders/${selectedOrder.id}/payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            paymentAmount: parseFloat(values.paymentAmount),
            bankAccountId: values.bankAccountId
              ? parseInt(values.bankAccountId)
              : null,
            orderType,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        message.success("Thanh toán thành công!");
        setSelectedOrder(null);
        setPaymentModalOpen(false);
        form.resetFields();
        onPaymentSuccess();
      } else {
        message.error(data.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      message.error("Có lỗi xảy ra");
    }
  };

  const handleOpenPayment = (order: Order) => {
    setSelectedOrder(order);
    setPaymentModalOpen(true);
    form.setFieldsValue({
      paymentAmount: order.remainingAmount.toString(),
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "CASH",
      bankAccountId: "",
      notes: "",
    });
  };

  const totalAmount = orders.reduce(
    (sum, o) =>
      sum +
      parseFloat(o.totalAmount?.toString() || o.finalAmount?.toString() || "0"),
    0
  );
  const totalPaid = orders.reduce(
    (sum, o) => sum + parseFloat(o.paidAmount.toString()),
    0
  );
  const totalRemaining = orders.reduce(
    (sum, o) => sum + parseFloat(o.remainingAmount.toString()),
    0
  );

  return (
    <div className="fixed right-0 top-0 h-full w-[700px] bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
        <div>
          <h2 className="text-xl font-bold">
            {orderType === "order" ? "Đơn hàng" : "Đơn mua"} - {partnerName}
          </h2>
          <p className="text-sm text-gray-600">{partnerCode}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Summary */}
        <Card className="bg-gray-50">
          <div className="text-sm text-gray-600 mb-4">Tổng hợp</div>
          <Row gutter={16}>
            <Col span={8}>
              <Card bordered={false} className="text-center">
                <Statistic
                  title="Tổng tiền"
                  value={totalAmount}
                  prefix={<ShoppingOutlined />}
                  valueStyle={{ color: "#1890ff" }}
                  formatter={(value) =>
                    `${Number(value).toLocaleString("vi-VN")} đ`
                  }
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="text-center bg-green-50">
                <Statistic
                  title="Đã trả"
                  value={totalPaid}
                  prefix={<PayCircleOutlined />}
                  valueStyle={{ color: "#52c41a" }}
                  formatter={(value) =>
                    `${Number(value).toLocaleString("vi-VN")} đ`
                  }
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="text-center bg-orange-50">
                <Statistic
                  title="Còn lại"
                  value={totalRemaining}
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: "#fa8c16" }}
                  formatter={(value) =>
                    `${Number(value).toLocaleString("vi-VN")} đ`
                  }
                />
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Orders List */}
        <div>
          <h3 className="font-medium mb-3">
            Danh sách {orderType === "order" ? "đơn hàng" : "đơn mua"}
          </h3>
          <div className="space-y-3">
            {orders.map((order) => (
              <Card
                key={order.id}
                className={`cursor-pointer transition-colors ${
                  selectedOrder?.id === order.id
                    ? "border-blue-500 bg-blue-50"
                    : ""
                }`}
                onClick={() => {
                  if (canEdit && order.remainingAmount > 0) {
                    handleOpenPayment(order);
                  }
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">{order.orderCode}</div>
                    <div className="text-xs text-gray-600">
                      {new Date(order.orderDate).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      order.paymentStatus === "PAID"
                        ? "bg-green-100 text-green-800"
                        : order.paymentStatus === "PARTIAL"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {order.paymentStatus === "PAID"
                      ? "Đã TT"
                      : order.paymentStatus === "PARTIAL"
                      ? "TT 1 phần"
                      : "Chưa TT"}
                  </span>
                </div>

                <Row gutter={8} className="mb-3">
                  <Col span={8}>
                    <div className="text-xs text-gray-600">Tổng tiền</div>
                    <div className="font-medium">
                      {parseFloat(
                        (order.finalAmount || order.totalAmount || 0).toString()
                      ).toLocaleString("vi-VN")}{" "}
                      đ
                    </div>
                  </Col>
                  <Col span={8}>
                    <div className="text-xs text-gray-600">Đã trả</div>
                    <div className="font-medium text-green-600">
                      {parseFloat(order.paidAmount.toString()).toLocaleString(
                        "vi-VN"
                      )}{" "}
                      đ
                    </div>
                  </Col>
                  <Col span={8}>
                    <div className="text-xs text-gray-600">Còn lại</div>
                    <div className="font-medium text-orange-600">
                      {parseFloat(
                        order.remainingAmount.toString()
                      ).toLocaleString("vi-VN")}{" "}
                      đ
                    </div>
                  </Col>
                </Row>

                {canEdit && order.remainingAmount > 0 && (
                  <Button
                    type="primary"
                    size="small"
                    block
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPayment(order);
                    }}
                  >
                    Thanh toán
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Payment Modal */}
        <Modal
          title={`Thanh toán đơn: ${selectedOrder?.orderCode}`}
          open={paymentModalOpen}
          onCancel={() => {
            setPaymentModalOpen(false);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form form={form} layout="vertical" onFinish={handlePaymentSubmit}>
            <Form.Item
              name="paymentAmount"
              label="Số tiền thanh toán"
              rules={[
                { required: true, message: "Vui lòng nhập số tiền" },
                {
                  type: "number",
                  min: 0,
                  max: selectedOrder?.remainingAmount || 0,
                  message: `Số tiền không được vượt quá ${selectedOrder?.remainingAmount?.toLocaleString(
                    "vi-VN"
                  )} đ`,
                },
              ]}
            >
              <Input
                type="number"
                prefix="₫"
                placeholder={`Tối đa: ${(
                  selectedOrder?.remainingAmount || 0
                ).toLocaleString("vi-VN")} đ`}
              />
            </Form.Item>

            <Form.Item
              name="paymentDate"
              label="Ngày thanh toán"
              rules={[
                { required: true, message: "Vui lòng chọn ngày thanh toán" },
              ]}
            >
              <Input type="date" />
            </Form.Item>

            <Form.Item
              name="paymentMethod"
              label="Phương thức thanh toán"
              rules={[
                {
                  required: true,
                  message: "Vui lòng chọn phương thức thanh toán",
                },
              ]}
            >
              <Select>
                <Select.Option value="CASH">Tiền mặt</Select.Option>
                <Select.Option value="BANK">Ngân hàng</Select.Option>
                <Select.Option value="TRANSFER">Chuyển khoản</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.paymentMethod !== currentValues.paymentMethod
              }
            >
              {({ getFieldValue }) =>
                (getFieldValue("paymentMethod") === "BANK" ||
                  getFieldValue("paymentMethod") === "TRANSFER") && (
                  <Form.Item
                    name="bankAccountId"
                    label="Tài khoản ngân hàng"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng chọn tài khoản ngân hàng",
                      },
                    ]}
                  >
                    <Select placeholder="Chọn tài khoản">
                      {bankAccounts.map((acc) => (
                        <Select.Option key={acc.id} value={acc.id}>
                          {acc.bankName} - {acc.accountNumber}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                )
              }
            </Form.Item>

            <Form.Item name="notes" label="Ghi chú">
              <Input.TextArea
                rows={3}
                placeholder="Nhập ghi chú (không bắt buộc)"
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => {
                    setPaymentModalOpen(false);
                    form.resetFields();
                  }}
                >
                  Hủy
                </Button>
                <Button type="primary" htmlType="submit">
                  Xác nhận thanh toán
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
