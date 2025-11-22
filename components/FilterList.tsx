/* eslint-disable @typescript-eslint/no-explicit-any */
import { FilterField } from "@/types";
import { Button, DatePicker, Divider, Form, Select, Space, Input } from "antd";

interface FilterListProps {
  fields: FilterField[];
  onApplyFilter: (arr: { key: string; value: any }[]) => void;
  onReset?: () => void;
  onCancel?: () => void;
}

export const FilterList: React.FC<FilterListProps> = ({
  fields,
  onApplyFilter,
  onReset,
  onCancel,
}) => {
  const [form] = Form.useForm();

  const handleReset = () => {
    form.resetFields();
    if (onReset) {
      onReset();
    }
  };

  const handleFinish = (values: Record<string, any>) => {
    const payload: {
      key: string;
      value: any;
    }[] = [];
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        payload.push({ key, value });
      }
    });
    onApplyFilter(payload);
  };

  const renderField = (field: FilterField) => {
    switch (field.type) {
      case "input":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            className=" mb-4"
          >
            <Input placeholder={field.placeholder || field.label} allowClear />
          </Form.Item>
        );

      case "select":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            className=" mb-4"
          >
            <Select
              options={field.options || []}
              placeholder={field.placeholder || `Chọn ${field.label}`}
              allowClear
            />
          </Form.Item>
        );

      case "date":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            className=" mb-4"
          >
            <DatePicker
              className=" w-full"
              placeholder={field.placeholder || field.label}
            />
          </Form.Item>
        );

      case "dateRange":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            className=" mb-4"
          >
            <DatePicker.RangePicker className=" w-full" />
          </Form.Item>
        );

      default:
        return null;
    }
  };

  return (
    <div className=" w-72">
      <div className=" flex  justify-between  items-center">
        <h3 className=" font-medium  mb-0">Bộ lọc</h3>
        <Button type="link" size="small" onClick={handleReset}>
          Đặt lại
        </Button>
      </div>
      <Divider className=" my-2" />
      <Form layout="vertical" form={form} onFinish={handleFinish}>
        {fields.map((field) => renderField(field))}

        <Divider className=" my-2" />

        <Form.Item className=" flex  justify-end  mb-0  mt-2">
          <Space>
            <Button size="small" onClick={onCancel}>
              Hủy
            </Button>
            <Button size="small" type="primary" htmlType="submit">
              Áp dụng
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};
