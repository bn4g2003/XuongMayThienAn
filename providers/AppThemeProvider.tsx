"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import { themeColors, ThemeName, getThemeTokens } from "@/configs/theme";
import Loader from "@/components/Loader";

// Context để các component con có thể gọi hàm chuyển theme
type ThemeContextType = {
  mode: "light" | "dark";
  themeName: ThemeName;
  setMode: (mode: "light" | "dark") => void;
  setThemeName: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  themeName: "default",
  setMode: () => {},
  setThemeName: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const AppThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Load settings từ localStorage (nếu muốn lưu lại)
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [themeName, setThemeName] = useState<ThemeName>("default");

  // 1. Đồng bộ với Tailwind (DOM & CSS Variables)
  useEffect(() => {
    const root = document.documentElement;

    // Xử lý Dark/Light mode
    root.classList.remove("light", "dark");
    root.classList.add(mode);

    // Xử lý Color Theme - Cập nhật CSS variables cho Tailwind
    const themeConfig = themeColors[themeName];

    // Cập nhật CSS variables cho Tailwind (sử dụng mã HEX)
    root.style.setProperty("--primary", themeConfig.primary);
    root.style.setProperty(
      "--primary-foreground",
      themeConfig.primaryForeground
    );

    // Cũng cập nhật các biến khác để đồng bộ
    root.style.setProperty("--ring", themeConfig.primary);
    root.style.setProperty("--sidebar-primary", themeConfig.primary);
    root.style.setProperty(
      "--sidebar-primary-foreground",
      themeConfig.primaryForeground
    );
    root.style.setProperty("--sidebar-ring", themeConfig.primary);

    // Xử lý data-theme attribute (nếu cần cho các custom styling khác)
    if (themeName === "default") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", themeName);
    }
  }, [mode, themeName]);

  // 2. Cấu hình cho Ant Design
  const baseThemeTokens = getThemeTokens(themeName, mode);

  return (
    <ThemeContext.Provider value={{ mode, themeName, setMode, setThemeName }}>
      <ConfigProvider
        spin={{
          indicator: <Loader />,
        }}
        theme={{
          algorithm:
            mode === "dark"
              ? antdTheme.darkAlgorithm
              : antdTheme.defaultAlgorithm,
          token: {
            ...baseThemeTokens,
            fontFamily: "inherit",
          },
          components: {
            Layout: {
              headerBg: mode === "dark" ? "#27272a" : "#ffffff",
              footerBg: mode === "dark" ? "#27272a" : "#ffffff",
              siderBg: mode === "dark" ? "#27272a" : "#ffffff",
              triggerBg:
                mode === "dark" ? baseThemeTokens.colorPrimary : "#ffffff",
              headerPadding: "0 24px",
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};
