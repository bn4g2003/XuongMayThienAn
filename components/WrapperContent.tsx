import AccessDenied from "@/components/AccessDenied";
import { FilterList } from "@/components/FilterList";
import LoaderApp from "@/components/LoaderApp";
import { useSetTitlePage } from "@/hooks/useSetTitlePage";
import { ColumnSetting, FilterField } from "@/types";
import { queriesToInvalidate } from "@/utils/refetchData";
import {
  ArrowLeftOutlined,
  FilterOutlined,
  SearchOutlined,
  SettingOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Button, Popover, Input, Checkbox, Divider, Empty } from "antd";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

interface WrapperContentProps {
  title?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  isNotAccessible?: boolean;
  isEmpty?: boolean;
  header: {
    isBackButton?: boolean;
    refetchDataWithKeys?: string[] | readonly string[];
    buttonEnds?: {
      danger?: boolean;
      type?: "link" | "default" | "text" | "primary" | "dashed" | undefined;
      onClick?: () => void;
      name: string;
      icon: React.ReactNode;
    }[];
    searchInput?: {
      placeholder: string;
      onChange: (value: string) => void;
    };
    filters?: {
      fields: FilterField[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onApplyFilter: (arr: { key: string; value: any }[]) => void;
      onReset?: () => void;
    };
    columnSettings?: {
      columns: ColumnSetting[];
      onChange: (columns: ColumnSetting[]) => void;
      onReset?: () => void;
    };
  };
  className?: string;
}

const WrapperContent: React.FC<WrapperContentProps> = ({
  children,
  title,
  header,
  isLoading = false,
  isNotAccessible = false,
  isEmpty = false,
  className = "",
}) => {
  const router = useRouter();
  useSetTitlePage(title || null);
  const [isOpenFilterModal, setIsOpenFilterModal] = useState(false);
  const [isOpenColumnSettings, setIsOpenColumnSettings] = useState(false);

  return (
    <div className={`space-y-10 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {header.isBackButton && (
            <Button
              type="default"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.back()}
            >
              Quay lại
            </Button>
          )}
          {header.searchInput && (
            <Input
              placeholder={header.searchInput.placeholder}
              onChange={(e) => header.searchInput?.onChange(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 256 }}
            />
          )}
          {header.filters && (
            <Popover
              trigger="click"
              placement="bottomLeft"
              content={
                <FilterList
                  onCancel={() => setIsOpenFilterModal(false)}
                  fields={header.filters?.fields || []}
                  onApplyFilter={(arr) => header.filters?.onApplyFilter(arr)}
                  onReset={() =>
                    header.filters?.onReset && header.filters.onReset()
                  }
                />
              }
              open={isOpenFilterModal}
              onOpenChange={setIsOpenFilterModal}
            >
              <Button icon={<FilterOutlined />} />
            </Popover>
          )}
          {header.columnSettings && (
            <Popover
              trigger="click"
              placement="bottomLeft"
              content={
                <div>
                  <div className=" flex  justify-between  items-center">
                    <h3 className=" font-medium  mb-0">Cài đặt cột</h3>
                    {header.columnSettings.onReset && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          if (header.columnSettings?.onReset) {
                            header.columnSettings.onReset();
                          }
                        }}
                      >
                        Đặt lại
                      </Button>
                    )}
                  </div>
                  <Divider className=" my-2" />

                  <div className="grid grid-rows-5 grid-cols-3 gap-4">
                    {header.columnSettings.columns.map((column) => (
                      <Checkbox
                        key={column.key}
                        checked={column.visible}
                        onChange={(e) => {
                          const newColumns = header.columnSettings!.columns.map(
                            (col) =>
                              col.key === column.key
                                ? { ...col, visible: e.target.checked }
                                : col
                          );
                          header.columnSettings!.onChange(newColumns);
                        }}
                      >
                        {column.title}
                      </Checkbox>
                    ))}
                  </div>
                </div>
              }
              open={isOpenColumnSettings}
              onOpenChange={setIsOpenColumnSettings}
            >
              <Button icon={<SettingOutlined />} />
            </Popover>
          )}
        </div>
        <div className="flex gap-3 items-center">
          {header.refetchDataWithKeys && (
            <Button
              type="default"
              icon={<SyncOutlined spin={isLoading} />}
              onClick={() => {
                if (header.refetchDataWithKeys) {
                  queriesToInvalidate(header.refetchDataWithKeys);
                }
              }}
            />
          )}
          {header.buttonEnds &&
            header.buttonEnds
              .sort((a, b) => {
                if (a.type === "primary" && b.type !== "primary") return 1;
                if (a.type !== "primary" && b.type === "primary") return -1;
                return 0;
              })
              .map((buttonEnd, index) => (
                <Button
                  danger={buttonEnd.danger}
                  key={index}
                  type={buttonEnd.type}
                  onClick={buttonEnd.onClick}
                  icon={buttonEnd.icon}
                >
                  {buttonEnd.name}
                </Button>
              ))}
        </div>
      </div>
      {isNotAccessible && !isLoading && <AccessDenied />}
      {isEmpty && !isNotAccessible && !isLoading && (
        <div className="flex min-h-[400px] items-center justify-center">
          <Empty description="Không có dữ liệu" />
        </div>
      )}
      {isLoading && (
        <div className="flex min-h-[400px] items-center justify-center">
          <LoaderApp />
        </div>
      )}
      {!isLoading && !isNotAccessible && children}
    </div>
  );
};

export default WrapperContent;
