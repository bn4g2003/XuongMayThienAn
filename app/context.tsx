import { AppThemeProvider } from "@/providers/AppThemeProvider";
import React from "react";

const AppContext = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <AppThemeProvider>{children}</AppThemeProvider>
    </>
  );
};

export default AppContext;
