"use client";
import { App } from "antd";
import * as XLSX from "xlsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useFileExport = <T extends Record<string, any> = Record<string, any>>() => {
  const { message } = App.useApp();

  const downloadFile = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToJson = (data: T[], fileName: string = "data.json") => {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: "application/json;charset=utf-8" });
      downloadFile(blob, fileName);
    } catch (err) {
        console.error(err)
      message.error("Lỗi xuất file JSON");
    }
  };

  const exportToCsv = (data: T[], fileName: string = "data.csv") => {
    try {
      const ws = XLSX.utils.json_to_sheet(data || []);
      const csvOutput = "\uFEFF" + XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
      downloadFile(blob, fileName);
    } catch (err) {
        console.error(err)

      message.error("Lỗi xuất file JSON");
    }
  };

  const exportToXlsx = (data: T[], fileName: string = "data.xlsx") => {
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data || []);
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      downloadFile(blob, fileName);
    } catch (err) {
        console.error(err)

      message.error("Lỗi xuất file JSON");
    }
  };

  return { exportToJson, exportToCsv, exportToXlsx };
};
